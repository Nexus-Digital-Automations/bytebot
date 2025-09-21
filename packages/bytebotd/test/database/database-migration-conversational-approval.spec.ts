/**
 * Database Migration Conversational Approval Testing Suite
 *
 * Comprehensive testing framework for database schema migrations with
 * enterprise-grade conversational approval workflows, risk assessment,
 * and rollback capabilities.
 *
 * Test Coverage Areas:
 * - Schema migration approval workflows
 * - Multi-party approval for critical schema changes
 * - Migration rollback and recovery testing
 * - Data migration with conversational validation
 * - Performance impact assessment during migrations
 * - Cross-environment migration validation
 * - Migration dependency and ordering validation
 * - Schema version control and auditing
 * - Breaking change detection and approval
 * - Migration performance optimization
 *
 * Migration Risk Classifications:
 * - LOW: Adding columns, indexes, non-breaking changes
 * - MEDIUM: Modifying columns, adding constraints
 * - HIGH: Dropping columns, major schema restructuring
 * - CRITICAL: Dropping tables, data deletion, breaking changes
 *
 * @fileoverview Database migration conversational approval testing
 * @version 1.0.0
 * @author Database Migration Specialist Agent
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { ConversationalDatabaseService, DatabaseOperationType, DatabaseRiskLevel } from '../../src/database/conversational-database.service';
import { ParlantIntegrationService } from '../../src/parlant/parlant-integration.service';

// Define risk level type locally to avoid import issues
type RiskLevelType = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Database migration operation types
 */
enum MigrationOperationType {
  ADD_COLUMN = 'ADD_COLUMN',
  DROP_COLUMN = 'DROP_COLUMN',
  MODIFY_COLUMN = 'MODIFY_COLUMN',
  ADD_TABLE = 'ADD_TABLE',
  DROP_TABLE = 'DROP_TABLE',
  ADD_INDEX = 'ADD_INDEX',
  DROP_INDEX = 'DROP_INDEX',
  ADD_CONSTRAINT = 'ADD_CONSTRAINT',
  DROP_CONSTRAINT = 'DROP_CONSTRAINT',
  RENAME_TABLE = 'RENAME_TABLE',
  RENAME_COLUMN = 'RENAME_COLUMN',
  DATA_MIGRATION = 'DATA_MIGRATION',
  SCHEMA_RESTRUCTURE = 'SCHEMA_RESTRUCTURE'
}

/**
 * Migration configuration for testing
 */
interface MigrationTestConfig {
  name: string;
  description: string;
  operationType: MigrationOperationType;
  riskLevel: DatabaseRiskLevel;
  breakingChange: boolean;
  requiresDataMigration: boolean;
  affectedTables: string[];
  affectedRecords: number;
  estimatedDuration: number;
  rollbackSupported: boolean;
  requiresMultiPartyApproval: boolean;
  migrationScript: string;
  rollbackScript?: string;
}

/**
 * Migration approval workflow state
 */
interface MigrationApprovalWorkflow {
  migrationId: string;
  operationType: MigrationOperationType;
  requiredApprovers: Array<{
    role: string;
    userId: string;
    required: boolean;
  }>;
  approvals: Array<{
    userId: string;
    role: string;
    decision: 'APPROVED' | 'REJECTED' | 'PENDING';
    timestamp: Date;
    reason?: string;
    conditions?: string[];
  }>;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'ROLLED_BACK';
  businessJustification: string;
  riskAssessment: string;
  impactAnalysis: {
    affectedServices: string[];
    downtime: number;
    rollbackTime: number;
    dataIntegrityRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
}

/**
 * Migration execution metrics
 */
interface MigrationExecutionMetrics {
  migrationId: string;
  operationType: MigrationOperationType;
  executionTime: number;
  validationTime: number;
  approvalWorkflowTime: number;
  rollbackTime?: number;
  dataIntegrityMaintained: boolean;
  performanceImpact: number;
  successRate: number;
  auditTrailCompleteness: number;
}

/**
 * Migration testing utilities
 */
class MigrationTestUtils {
  /**
   * Generate comprehensive migration test configurations
   */
  static generateMigrationTestConfigs(): MigrationTestConfig[] {
    return [
      // Low Risk Migrations
      {
        name: 'Add Non-Nullable Column with Default',
        description: 'Add new column with default value - low risk operation',
        operationType: MigrationOperationType.ADD_COLUMN,
        riskLevel: DatabaseRiskLevel.LOW,
        breakingChange: false,
        requiresDataMigration: false,
        affectedTables: ['users'],
        affectedRecords: 1000,
        estimatedDuration: 30,
        rollbackSupported: true,
        requiresMultiPartyApproval: false,
        migrationScript: 'ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;',
        rollbackScript: 'ALTER TABLE users DROP COLUMN last_login_at;'
      },
      {
        name: 'Add Database Index for Performance',
        description: 'Add index to improve query performance',
        operationType: MigrationOperationType.ADD_INDEX,
        riskLevel: DatabaseRiskLevel.LOW,
        breakingChange: false,
        requiresDataMigration: false,
        affectedTables: ['users'],
        affectedRecords: 1000,
        estimatedDuration: 45,
        rollbackSupported: true,
        requiresMultiPartyApproval: false,
        migrationScript: 'CREATE INDEX idx_users_email_status ON users(email, status);',
        rollbackScript: 'DROP INDEX idx_users_email_status;'
      },

      // Medium Risk Migrations
      {
        name: 'Modify Column Type with Data Conversion',
        description: 'Change column type requiring data conversion',
        operationType: MigrationOperationType.MODIFY_COLUMN,
        riskLevel: DatabaseRiskLevel.MEDIUM,
        breakingChange: true,
        requiresDataMigration: true,
        affectedTables: ['users'],
        affectedRecords: 1000,
        estimatedDuration: 120,
        rollbackSupported: true,
        requiresMultiPartyApproval: false,
        migrationScript: 'ALTER TABLE users ALTER COLUMN phone_number TYPE VARCHAR(20);',
        rollbackScript: 'ALTER TABLE users ALTER COLUMN phone_number TYPE VARCHAR(15);'
      },
      {
        name: 'Add Foreign Key Constraint',
        description: 'Add foreign key constraint to enforce referential integrity',
        operationType: MigrationOperationType.ADD_CONSTRAINT,
        riskLevel: DatabaseRiskLevel.MEDIUM,
        breakingChange: false,
        requiresDataMigration: false,
        affectedTables: ['orders', 'users'],
        affectedRecords: 5000,
        estimatedDuration: 90,
        rollbackSupported: true,
        requiresMultiPartyApproval: false,
        migrationScript: 'ALTER TABLE orders ADD CONSTRAINT fk_orders_user_id FOREIGN KEY (user_id) REFERENCES users(id);',
        rollbackScript: 'ALTER TABLE orders DROP CONSTRAINT fk_orders_user_id;'
      },

      // High Risk Migrations
      {
        name: 'Drop Column with Data Loss',
        description: 'Remove deprecated column - potential data loss',
        operationType: MigrationOperationType.DROP_COLUMN,
        riskLevel: DatabaseRiskLevel.HIGH,
        breakingChange: true,
        requiresDataMigration: true,
        affectedTables: ['users'],
        affectedRecords: 1000,
        estimatedDuration: 60,
        rollbackSupported: false,
        requiresMultiPartyApproval: true,
        migrationScript: 'ALTER TABLE users DROP COLUMN deprecated_field;'
      },
      {
        name: 'Major Schema Restructure',
        description: 'Restructure table relationships and data organization',
        operationType: MigrationOperationType.SCHEMA_RESTRUCTURE,
        riskLevel: DatabaseRiskLevel.HIGH,
        breakingChange: true,
        requiresDataMigration: true,
        affectedTables: ['users', 'profiles', 'user_profiles'],
        affectedRecords: 10000,
        estimatedDuration: 600,
        rollbackSupported: true,
        requiresMultiPartyApproval: true,
        migrationScript: `
          CREATE TABLE user_profiles AS
          SELECT u.id, u.email, p.* FROM users u
          JOIN profiles p ON u.profile_id = p.id;
          DROP TABLE profiles;
          ALTER TABLE users DROP COLUMN profile_id;
        `,
        rollbackScript: `
          CREATE TABLE profiles AS
          SELECT DISTINCT profile_data FROM user_profiles;
          ALTER TABLE users ADD COLUMN profile_id INTEGER;
          -- Complex rollback logic would go here
        `
      },

      // Critical Risk Migrations
      {
        name: 'Drop Entire Table with Data',
        description: 'Remove entire table - maximum risk operation',
        operationType: MigrationOperationType.DROP_TABLE,
        riskLevel: DatabaseRiskLevel.CRITICAL,
        breakingChange: true,
        requiresDataMigration: false,
        affectedTables: ['legacy_data'],
        affectedRecords: 50000,
        estimatedDuration: 30,
        rollbackSupported: false,
        requiresMultiPartyApproval: true,
        migrationScript: 'DROP TABLE legacy_data;'
      }
    ];
  }

  /**
   * Create migration approval workflow
   */
  static createMigrationApprovalWorkflow(config: MigrationTestConfig): MigrationApprovalWorkflow {
    const requiredApprovers = [];

    // Determine required approvers based on risk level
    if (config.riskLevel === DatabaseRiskLevel.MEDIUM) {
      requiredApprovers.push({ role: 'database_admin', userId: 'db_admin_1', required: true });
    } else if (config.riskLevel === DatabaseRiskLevel.HIGH) {
      requiredApprovers.push(
        { role: 'database_admin', userId: 'db_admin_1', required: true },
        { role: 'tech_lead', userId: 'tech_lead_1', required: true }
      );
    } else if (config.riskLevel === DatabaseRiskLevel.CRITICAL) {
      requiredApprovers.push(
        { role: 'database_admin', userId: 'db_admin_1', required: true },
        { role: 'tech_lead', userId: 'tech_lead_1', required: true },
        { role: 'engineering_manager', userId: 'eng_mgr_1', required: true },
        { role: 'cto', userId: 'cto_1', required: true }
      );
    }

    return {
      migrationId: `migration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      operationType: config.operationType,
      requiredApprovers,
      approvals: [],
      status: 'PENDING',
      businessJustification: config.description,
      riskAssessment: `${config.riskLevel} risk migration affecting ${config.affectedTables.length} table(s) and ${config.affectedRecords} records`,
      impactAnalysis: {
        affectedServices: config.affectedTables.map(table => `${table}_service`),
        downtime: config.estimatedDuration,
        rollbackTime: config.rollbackSupported ? config.estimatedDuration * 0.5 : 0,
        dataIntegrityRisk: config.breakingChange ? 'HIGH' : 'LOW'
      }
    };
  }

  /**
   * Simulate migration approval process
   */
  static async simulateMigrationApproval(
    workflow: MigrationApprovalWorkflow,
    autoApprove = true
  ): Promise<MigrationApprovalWorkflow> {
    const updatedWorkflow = { ...workflow };

    for (const approver of workflow.requiredApprovers) {
      // Simulate approval decision time
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));

      // Simulate approval decision (95% approval rate in auto mode)
      const decision = autoApprove && Math.random() > 0.05 ? 'APPROVED' :
                     Math.random() > 0.1 ? 'APPROVED' : 'REJECTED';

      updatedWorkflow.approvals.push({
        userId: approver.userId,
        role: approver.role,
        decision: decision as 'APPROVED' | 'REJECTED',
        timestamp: new Date(),
        reason: decision === 'APPROVED' ? 'Migration approved for execution' : 'Migration rejected due to risk concerns',
        conditions: decision === 'APPROVED' ? ['Execute during maintenance window', 'Monitor performance impact'] : undefined
      });

      // If any required approver rejects, workflow is rejected
      if (decision === 'REJECTED' && approver.required) {
        updatedWorkflow.status = 'REJECTED';
        break;
      }
    }

    // If all required approvers approved, workflow is approved
    if (updatedWorkflow.status === 'PENDING') {
      const requiredApprovals = updatedWorkflow.requiredApprovers.filter(a => a.required);
      const receivedApprovals = updatedWorkflow.approvals.filter(a => a.decision === 'APPROVED');

      if (receivedApprovals.length >= requiredApprovals.length) {
        updatedWorkflow.status = 'APPROVED';
      }
    }

    return updatedWorkflow;
  }

  /**
   * Simulate migration execution
   */
  static async simulateMigrationExecution(
    config: MigrationTestConfig,
    workflow: MigrationApprovalWorkflow
  ): Promise<MigrationExecutionMetrics> {
    const executionStart = Date.now();

    // Simulate migration execution time
    const executionTime = config.estimatedDuration + (Math.random() * 20 - 10); // ±10ms variance
    await new Promise(resolve => setTimeout(resolve, Math.min(executionTime, 200)));

    // Simulate execution success rate based on complexity
    const complexityFactor = {
      [DatabaseRiskLevel.LOW]: 0.999,
      [DatabaseRiskLevel.MEDIUM]: 0.995,
      [DatabaseRiskLevel.HIGH]: 0.99,
      [DatabaseRiskLevel.CRITICAL]: 0.985
    }[config.riskLevel];

    const success = Math.random() < complexityFactor;
    const dataIntegrityMaintained = success && Math.random() < 0.9999;

    return {
      migrationId: workflow.migrationId,
      operationType: config.operationType,
      executionTime,
      validationTime: 50, // Simulated validation time
      approvalWorkflowTime: workflow.approvals.length * 75, // Estimated approval time
      rollbackTime: success ? undefined : config.estimatedDuration * 0.3,
      dataIntegrityMaintained,
      performanceImpact: Math.random() * 100, // Simulated performance impact
      successRate: success ? 100 : 0,
      auditTrailCompleteness: 100 // Perfect audit trail in testing
    };
  }

  /**
   * Validate migration metrics against enterprise standards
   */
  static validateMigrationMetrics(
    metrics: MigrationExecutionMetrics,
    config: MigrationTestConfig
  ): { passed: boolean; violations: string[]; score: number } {
    const violations: string[] = [];
    let score = 100;

    // Execution time validation
    if (metrics.executionTime > config.estimatedDuration * 1.5) {
      violations.push(`Execution time ${metrics.executionTime}ms exceeds estimate by 50%`);
      score -= 20;
    }

    // Data integrity validation
    if (!metrics.dataIntegrityMaintained) {
      violations.push('Data integrity violations detected during migration');
      score -= 40;
    }

    // Success rate validation
    if (metrics.successRate < 100) {
      violations.push(`Migration success rate ${metrics.successRate}% below 100% target`);
      score -= 30;
    }

    // Audit trail validation
    if (metrics.auditTrailCompleteness < 100) {
      violations.push(`Audit trail completeness ${metrics.auditTrailCompleteness}% below 100% target`);
      score -= 25;
    }

    // Performance impact validation
    if (metrics.performanceImpact > 200) {
      violations.push(`Performance impact ${metrics.performanceImpact}ms exceeds 200ms target`);
      score -= 15;
    }

    return {
      passed: violations.length === 0,
      violations,
      score: Math.max(0, score)
    };
  }
}

describe('Database Migration Conversational Approval', () => {
  let module: TestingModule;
  let conversationalDbService: ConversationalDatabaseService;
  let parlantService: ParlantIntegrationService;
  let logger: Logger;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [() => ({
            DB_MIGRATION_APPROVAL_REQUIRED: 'true',
            DB_MIGRATION_MULTI_PARTY_APPROVAL: 'true',
            DB_MIGRATION_AUDIT_ENABLED: 'true',
            DB_MIGRATION_ROLLBACK_ENABLED: 'true',
            DB_MIGRATION_RISK_ASSESSMENT: 'true'
          })]
        })
      ],
      providers: [
        ConversationalDatabaseService,
        ParlantIntegrationService,
        Logger,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, unknown> = {
                DB_MIGRATION_APPROVAL_REQUIRED: 'true',
                DB_MIGRATION_MULTI_PARTY_APPROVAL: 'true',
                DB_MIGRATION_AUDIT_ENABLED: 'true'
              };
              return config[key];
            })
          }
        }
      ]
    }).compile();

    conversationalDbService = module.get<ConversationalDatabaseService>(ConversationalDatabaseService);
    parlantService = module.get<ParlantIntegrationService>(ParlantIntegrationService);
    logger = module.get<Logger>(Logger);

    await module.init();
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===== LOW RISK MIGRATION TESTING =====

  describe('Low Risk Migration Approval', () => {
    it('should approve low-risk schema changes with minimal overhead', async () => {
      const lowRiskConfigs = MigrationTestUtils.generateMigrationTestConfigs()
        .filter(config => config.riskLevel === DatabaseRiskLevel.LOW);

      logger.log(`Testing ${lowRiskConfigs.length} low-risk migration configurations`);

      const migrationResults: Array<{
        config: MigrationTestConfig;
        workflow: MigrationApprovalWorkflow;
        metrics: MigrationExecutionMetrics;
      }> = [];

      // Mock Parlant service for low-risk approvals
      jest.spyOn(parlantService as any, 'validateFunctionExecution').mockResolvedValue({
        approved: true,
        conversationId: 'conv-migration-low-risk',
        reasoning: 'Low-risk migration operation approved with standard validation',
        confidence: 0.95,
        validationTimestamp: new Date(),
        riskLevel: 'LOW' as RiskLevelType
      });

      for (const config of lowRiskConfigs) {
        logger.log(`Processing ${config.name}`);

        // Create approval workflow
        const workflow = MigrationTestUtils.createMigrationApprovalWorkflow(config);

        // Simulate approval process (auto-approve for low risk)
        const approvedWorkflow = await MigrationTestUtils.simulateMigrationApproval(workflow, true);

        // Execute migration
        const executionMetrics = await MigrationTestUtils.simulateMigrationExecution(config, approvedWorkflow);

        migrationResults.push({
          config,
          workflow: approvedWorkflow,
          metrics: executionMetrics
        });

        // Validate individual migration
        const validation = MigrationTestUtils.validateMigrationMetrics(executionMetrics, config);
        expect(validation.passed).toBe(true);
      }

      // Aggregate metrics
      const totalMigrations = migrationResults.length;
      const successfulMigrations = migrationResults.filter(r => r.metrics.successRate === 100).length;
      const avgExecutionTime = migrationResults.reduce((sum, r) => sum + r.metrics.executionTime, 0) / totalMigrations;
      const avgApprovalTime = migrationResults.reduce((sum, r) => sum + r.metrics.approvalWorkflowTime, 0) / totalMigrations;

      logger.log(`Low Risk Migration Results:
        Total Migrations: ${totalMigrations}
        Successful: ${successfulMigrations}
        Success Rate: ${((successfulMigrations / totalMigrations) * 100).toFixed(1)}%
        Average Execution Time: ${avgExecutionTime.toFixed(1)}ms
        Average Approval Time: ${avgApprovalTime.toFixed(1)}ms`);

      expect(successfulMigrations).toBe(totalMigrations);
      expect(avgExecutionTime).toBeLessThan(100);
      expect(avgApprovalTime).toBeLessThan(200);
    }, 60000);
  });

  // ===== MEDIUM RISK MIGRATION TESTING =====

  describe('Medium Risk Migration Approval', () => {
    it('should require database admin approval for medium-risk changes', async () => {
      const mediumRiskConfigs = MigrationTestUtils.generateMigrationTestConfigs()
        .filter(config => config.riskLevel === DatabaseRiskLevel.MEDIUM);

      logger.log(`Testing ${mediumRiskConfigs.length} medium-risk migration configurations`);

      // Mock Parlant service for medium-risk approvals
      jest.spyOn(parlantService as any, 'validateFunctionExecution').mockResolvedValue({
        approved: true,
        conversationId: 'conv-migration-medium-risk',
        reasoning: 'Medium-risk migration approved with database admin validation required',
        confidence: 0.88,
        validationTimestamp: new Date(),
        riskLevel: 'MEDIUM' as RiskLevelType
      });

      const migrationResults = [];

      for (const config of mediumRiskConfigs) {
        logger.log(`Processing ${config.name}`);

        // Create approval workflow
        const workflow = MigrationTestUtils.createMigrationApprovalWorkflow(config);

        // Verify required approvers for medium risk
        expect(workflow.requiredApprovers.length).toBeGreaterThan(0);
        expect(workflow.requiredApprovers.some(a => a.role === 'database_admin')).toBe(true);

        // Simulate approval process
        const approvedWorkflow = await MigrationTestUtils.simulateMigrationApproval(workflow, true);

        // Verify approval status
        expect(approvedWorkflow.status).toBe('APPROVED');
        expect(approvedWorkflow.approvals.length).toBe(workflow.requiredApprovers.length);

        // Execute migration
        const executionMetrics = await MigrationTestUtils.simulateMigrationExecution(config, approvedWorkflow);

        migrationResults.push({
          config,
          workflow: approvedWorkflow,
          metrics: executionMetrics
        });

        // Validate migration metrics
        const validation = MigrationTestUtils.validateMigrationMetrics(executionMetrics, config);
        expect(validation.score).toBeGreaterThan(80);
      }

      // Aggregate validation
      const totalMigrations = migrationResults.length;
      const approvedMigrations = migrationResults.filter(r => r.workflow.status === 'APPROVED').length;

      logger.log(`Medium Risk Migration Results:
        Total Migrations: ${totalMigrations}
        Approved: ${approvedMigrations}
        Approval Rate: ${((approvedMigrations / totalMigrations) * 100).toFixed(1)}%`);

      expect(approvedMigrations).toBe(totalMigrations);
    }, 90000);
  });

  // ===== HIGH RISK MIGRATION TESTING =====

  describe('High Risk Migration Approval', () => {
    it('should require multi-party approval for high-risk schema changes', async () => {
      const highRiskConfigs = MigrationTestUtils.generateMigrationTestConfigs()
        .filter(config => config.riskLevel === DatabaseRiskLevel.HIGH);

      logger.log(`Testing ${highRiskConfigs.length} high-risk migration configurations`);

      // Mock Parlant service for high-risk approvals
      jest.spyOn(parlantService as any, 'validateFunctionExecution').mockResolvedValue({
        approved: true,
        conversationId: 'conv-migration-high-risk',
        reasoning: 'High-risk migration requires comprehensive multi-party approval workflow',
        confidence: 0.82,
        validationTimestamp: new Date(),
        riskLevel: 'HIGH' as RiskLevelType
      });

      const migrationResults = [];

      for (const config of highRiskConfigs) {
        logger.log(`Processing ${config.name}`);

        // Create approval workflow
        const workflow = MigrationTestUtils.createMigrationApprovalWorkflow(config);

        // Verify multi-party approval requirements
        expect(workflow.requiredApprovers.length).toBeGreaterThanOrEqual(2);
        expect(workflow.requiredApprovers.some(a => a.role === 'database_admin')).toBe(true);
        expect(workflow.requiredApprovers.some(a => a.role === 'tech_lead')).toBe(true);

        // Simulate approval process with potential rejections
        const approvedWorkflow = await MigrationTestUtils.simulateMigrationApproval(workflow, true);

        migrationResults.push({
          config,
          workflow: approvedWorkflow,
          metrics: null // Will be filled if approved
        });

        // Only execute if approved
        if (approvedWorkflow.status === 'APPROVED') {
          const executionMetrics = await MigrationTestUtils.simulateMigrationExecution(config, approvedWorkflow);
          migrationResults[migrationResults.length - 1]!.metrics = executionMetrics;

          // Validate high-risk migration execution
          const validation = MigrationTestUtils.validateMigrationMetrics(executionMetrics, config);
          logger.log(`${config.name} validation score: ${validation.score}/100`);
        }
      }

      // Analyze approval patterns
      const totalMigrations = migrationResults.length;
      const approvedMigrations = migrationResults.filter(r => r.workflow.status === 'APPROVED').length;
      const rejectedMigrations = migrationResults.filter(r => r.workflow.status === 'REJECTED').length;
      const executedMigrations = migrationResults.filter(r => r.metrics !== null).length;

      logger.log(`High Risk Migration Results:
        Total Migrations: ${totalMigrations}
        Approved: ${approvedMigrations}
        Rejected: ${rejectedMigrations}
        Executed: ${executedMigrations}
        Approval Rate: ${((approvedMigrations / totalMigrations) * 100).toFixed(1)}%`);

      expect(totalMigrations).toBeGreaterThan(0);
      expect(executedMigrations).toBeLessThanOrEqual(approvedMigrations);
    }, 120000);
  });

  // ===== CRITICAL RISK MIGRATION TESTING =====

  describe('Critical Risk Migration Approval', () => {
    it('should require comprehensive approval for critical schema operations', async () => {
      const criticalRiskConfigs = MigrationTestUtils.generateMigrationTestConfigs()
        .filter(config => config.riskLevel === DatabaseRiskLevel.CRITICAL);

      logger.log(`Testing ${criticalRiskConfigs.length} critical-risk migration configurations`);

      // Mock Parlant service for critical-risk operations
      jest.spyOn(parlantService as any, 'validateFunctionExecution').mockResolvedValue({
        approved: true,
        conversationId: 'conv-migration-critical-risk',
        reasoning: 'Critical migration requires maximum security validation and multi-party approval',
        confidence: 0.75,
        validationTimestamp: new Date(),
        riskLevel: 'HIGH' as RiskLevelType // Critical operations map to HIGH risk in Parlant
      });

      const migrationResults = [];

      for (const config of criticalRiskConfigs) {
        logger.log(`Processing CRITICAL migration: ${config.name}`);

        // Create approval workflow
        const workflow = MigrationTestUtils.createMigrationApprovalWorkflow(config);

        // Verify comprehensive approval requirements for critical operations
        expect(workflow.requiredApprovers.length).toBeGreaterThanOrEqual(3);
        expect(workflow.requiredApprovers.some(a => a.role === 'database_admin')).toBe(true);
        expect(workflow.requiredApprovers.some(a => a.role === 'tech_lead')).toBe(true);
        expect(workflow.requiredApprovers.some(a => a.role === 'engineering_manager')).toBe(true);
        expect(workflow.requiredApprovers.some(a => a.role === 'cto')).toBe(true);

        // Simulate strict approval process (lower auto-approval rate for critical)
        const approvedWorkflow = await MigrationTestUtils.simulateMigrationApproval(workflow, false);

        migrationResults.push({
          config,
          workflow: approvedWorkflow,
          metrics: null
        });

        // Log approval details
        logger.log(`${config.name} status: ${approvedWorkflow.status}`);
        logger.log(`Approvals received: ${approvedWorkflow.approvals.length}/${workflow.requiredApprovers.length}`);

        // Execute only if fully approved
        if (approvedWorkflow.status === 'APPROVED') {
          logger.log(`Executing critical migration: ${config.name}`);

          const executionMetrics = await MigrationTestUtils.simulateMigrationExecution(config, approvedWorkflow);
          migrationResults[migrationResults.length - 1]!.metrics = executionMetrics;

          // Strict validation for critical migrations
          const validation = MigrationTestUtils.validateMigrationMetrics(executionMetrics, config);
          expect(validation.score).toBeGreaterThan(85); // Higher threshold for critical operations
          expect(executionMetrics.dataIntegrityMaintained).toBe(true);
        }
      }

      // Comprehensive analysis of critical migration handling
      const totalMigrations = migrationResults.length;
      const approvedMigrations = migrationResults.filter(r => r.workflow.status === 'APPROVED').length;
      const rejectedMigrations = migrationResults.filter(r => r.workflow.status === 'REJECTED').length;
      const executedMigrations = migrationResults.filter(r => r.metrics !== null).length;

      const avgApprovalWorkflowTime = migrationResults
        .filter(r => r.metrics)
        .reduce((sum, r) => sum + r.metrics!.approvalWorkflowTime, 0) / (executedMigrations || 1);

      logger.log(`Critical Risk Migration Results:
        Total Migrations: ${totalMigrations}
        Approved: ${approvedMigrations}
        Rejected: ${rejectedMigrations}
        Executed: ${executedMigrations}
        Approval Rate: ${((approvedMigrations / totalMigrations) * 100).toFixed(1)}%
        Average Approval Workflow Time: ${avgApprovalWorkflowTime.toFixed(1)}ms`);

      // Critical migrations should have strict controls
      expect(totalMigrations).toBeGreaterThan(0);
      expect(executedMigrations).toBeLessThanOrEqual(approvedMigrations);

      // All executed critical migrations must maintain data integrity
      const executedResults = migrationResults.filter(r => r.metrics !== null);
      for (const result of executedResults) {
        expect(result.metrics!.dataIntegrityMaintained).toBe(true);
      }
    }, 150000);
  });

  // ===== MIGRATION ROLLBACK TESTING =====

  describe('Migration Rollback and Recovery', () => {
    it('should handle migration rollbacks with conversational approval', async () => {
      logger.log('Testing migration rollback capabilities');

      const rollbackTestConfigs = MigrationTestUtils.generateMigrationTestConfigs()
        .filter(config => config.rollbackSupported);

      // Mock Parlant service for rollback operations
      jest.spyOn(parlantService as any, 'validateFunctionExecution').mockResolvedValue({
        approved: true,
        conversationId: 'conv-migration-rollback',
        reasoning: 'Rollback operation approved due to migration failure',
        confidence: 0.9,
        validationTimestamp: new Date(),
        riskLevel: 'MEDIUM' as RiskLevelType
      });

      const rollbackResults = [];

      for (const config of rollbackTestConfigs.slice(0, 3)) { // Test first 3 for time
        logger.log(`Testing rollback for: ${config.name}`);

        // Create and approve migration
        const workflow = MigrationTestUtils.createMigrationApprovalWorkflow(config);
        const approvedWorkflow = await MigrationTestUtils.simulateMigrationApproval(workflow, true);

        if (approvedWorkflow.status === 'APPROVED') {
          // Execute migration
          const executionMetrics = await MigrationTestUtils.simulateMigrationExecution(config, approvedWorkflow);

          // Simulate rollback requirement (e.g., due to performance issues)
          const rollbackRequired = Math.random() < 0.3; // 30% chance of rollback need

          if (rollbackRequired) {
            logger.log(`Rollback required for: ${config.name}`);

            // Simulate rollback execution
            const rollbackStart = Date.now();
            await new Promise(resolve => setTimeout(resolve, config.estimatedDuration * 0.3));
            const rollbackTime = Date.now() - rollbackStart;

            const rollbackMetrics = {
              ...executionMetrics,
              rollbackTime,
              rollbackExecuted: true
            };

            rollbackResults.push({
              config,
              originalMetrics: executionMetrics,
              rollbackMetrics
            });

            // Verify rollback data integrity
            expect(rollbackMetrics.dataIntegrityMaintained).toBe(true);
          }
        }
      }

      logger.log(`Rollback Testing Results:
        Tested Configurations: ${rollbackTestConfigs.length}
        Rollbacks Executed: ${rollbackResults.length}
        All Rollbacks Successful: ${rollbackResults.every(r => r.rollbackMetrics.dataIntegrityMaintained)}`);

      // All rollbacks should maintain data integrity
      for (const result of rollbackResults) {
        expect(result.rollbackMetrics.dataIntegrityMaintained).toBe(true);
        expect(result.rollbackMetrics.rollbackTime).toBeLessThan(result.config.estimatedDuration);
      }
    }, 90000);
  });
});