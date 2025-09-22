/**
 * Deployment Documentation Manager - Comprehensive Infrastructure Documentation
 *
 * This system provides automated generation and management of deployment
 * documentation including runbooks, operational procedures, troubleshooting
 * guides, and configuration documentation.
 *
 * @fileoverview Deployment and operations documentation management system
 * @version 1.0.0
 * @author Documentation Infrastructure Agent
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Logger } from '@nestjs/common';
import { glob } from 'glob';

/**
 * Configuration for deployment documentation
 */
export interface DeploymentDocConfig {
  environmentsDirectory: string;
  configDirectory: string;
  scriptsDirectory: string;
  outputDirectory: string;
  templateDirectory: string;
  includeSecrets: boolean;
  generateRunbooks: boolean;
  generateTroubleshooting: boolean;
  generateOperationalGuides: boolean;
  generateConfigurationDocs: boolean;
  validateConfigurations: boolean;
}

/**
 * Default deployment documentation configuration
 */
export const DEFAULT_DEPLOYMENT_CONFIG: DeploymentDocConfig = {
  environmentsDirectory: 'environments',
  configDirectory: 'config',
  scriptsDirectory: 'scripts',
  outputDirectory: 'docs/deployment',
  templateDirectory: 'docs/templates',
  includeSecrets: false,
  generateRunbooks: true,
  generateTroubleshooting: true,
  generateOperationalGuides: true,
  generateConfigurationDocs: true,
  validateConfigurations: true,
};

/**
 * Environment configuration documentation
 */
export interface EnvironmentDoc {
  name: string;
  description: string;
  purpose: string;
  infrastructure: InfrastructureDoc;
  services: ServiceDoc[];
  configuration: ConfigurationDoc[];
  secrets: SecretDoc[];
  healthChecks: HealthCheckDoc[];
  monitoring: MonitoringDoc;
  backup: BackupDoc;
  disaster_recovery: DisasterRecoveryDoc;
}

/**
 * Infrastructure documentation
 */
export interface InfrastructureDoc {
  provider: string;
  region: string;
  compute: ComputeDoc[];
  networking: NetworkDoc;
  storage: StorageDoc[];
  databases: DatabaseDoc[];
  load_balancers: LoadBalancerDoc[];
  dns: DNSDoc[];
}

/**
 * Service documentation
 */
export interface ServiceDoc {
  name: string;
  type: 'api' | 'frontend' | 'worker' | 'database' | 'cache' | 'queue';
  description: string;
  version: string;
  port: number;
  endpoints: string[];
  dependencies: string[];
  environment_variables: EnvironmentVariableDoc[];
  resource_requirements: ResourceRequirementsDoc;
  scaling: ScalingDoc;
  deployment_strategy: DeploymentStrategyDoc;
}

/**
 * Configuration documentation
 */
export interface ConfigurationDoc {
  file: string;
  format: 'json' | 'yaml' | 'env' | 'ini';
  description: string;
  required: boolean;
  sensitive: boolean;
  settings: SettingDoc[];
  validation_rules: ValidationRuleDoc[];
}

/**
 * Runbook entry documentation
 */
export interface RunbookEntry {
  id: string;
  title: string;
  category: 'deployment' | 'maintenance' | 'troubleshooting' | 'monitoring';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  prerequisites: string[];
  steps: RunbookStep[];
  rollback_steps: RunbookStep[];
  validation_steps: RunbookStep[];
  automated: boolean;
  estimated_time: string;
  contact_info: string[];
  last_updated: Date;
}

/**
 * Runbook step documentation
 */
export interface RunbookStep {
  step_number: number;
  description: string;
  command?: string;
  expected_output?: string;
  troubleshooting?: string[];
  rollback_command?: string;
  validation_command?: string;
  notes: string[];
}

/**
 * Troubleshooting guide documentation
 */
export interface TroubleshootingGuide {
  id: string;
  title: string;
  category: string;
  symptoms: string[];
  possible_causes: string[];
  diagnostic_steps: DiagnosticStep[];
  solutions: SolutionStep[];
  prevention: string[];
  escalation_path: string[];
  related_issues: string[];
}

/**
 * Diagnostic step documentation
 */
export interface DiagnosticStep {
  step: string;
  command: string;
  expected_output: string;
  interpretation: string;
  next_steps: string[];
}

/**
 * Solution step documentation
 */
export interface SolutionStep {
  step: string;
  description: string;
  commands: string[];
  verification: string;
  rollback: string[];
  risk_level: 'low' | 'medium' | 'high';
}

// Supporting interfaces
export interface ComputeDoc {
  type: string;
  size: string;
  count: number;
  autoscaling: boolean;
}

export interface NetworkDoc {
  vpc_id: string;
  subnets: string[];
  security_groups: string[];
  ingress_rules: string[];
  egress_rules: string[];
}

export interface StorageDoc {
  type: string;
  size: string;
  backup_enabled: boolean;
  encryption: boolean;
}

export interface DatabaseDoc {
  type: string;
  version: string;
  size: string;
  backup_retention: string;
  encryption: boolean;
  high_availability: boolean;
}

export interface LoadBalancerDoc {
  type: string;
  scheme: string;
  health_check_path: string;
  ssl_certificate: string;
}

export interface DNSDoc {
  domain: string;
  type: string;
  value: string;
  ttl: number;
}

export interface EnvironmentVariableDoc {
  name: string;
  description: string;
  required: boolean;
  sensitive: boolean;
  default_value?: string;
  validation_pattern?: string;
}

export interface ResourceRequirementsDoc {
  cpu: string;
  memory: string;
  disk: string;
  network: string;
}

export interface ScalingDoc {
  min_instances: number;
  max_instances: number;
  target_cpu: number;
  target_memory: number;
  scale_up_cooldown: string;
  scale_down_cooldown: string;
}

export interface DeploymentStrategyDoc {
  type: 'rolling' | 'blue_green' | 'canary';
  parameters: Record<string, any>;
  rollback_strategy: string;
}

export interface SecretDoc {
  name: string;
  description: string;
  rotation_policy: string;
  access_policy: string[];
}

export interface HealthCheckDoc {
  name: string;
  type: 'http' | 'tcp' | 'command';
  endpoint: string;
  interval: string;
  timeout: string;
  healthy_threshold: number;
  unhealthy_threshold: number;
}

export interface MonitoringDoc {
  metrics: MetricDoc[];
  alerts: AlertDoc[];
  dashboards: DashboardDoc[];
  logging: LoggingDoc;
}

export interface MetricDoc {
  name: string;
  description: string;
  unit: string;
  collection_interval: string;
  retention_period: string;
}

export interface AlertDoc {
  name: string;
  condition: string;
  threshold: string;
  notification_channels: string[];
  escalation_policy: string;
}

export interface DashboardDoc {
  name: string;
  description: string;
  widgets: string[];
  filters: string[];
}

export interface LoggingDoc {
  retention_period: string;
  log_levels: string[];
  aggregation: boolean;
  export_destinations: string[];
}

export interface BackupDoc {
  frequency: string;
  retention_period: string;
  storage_location: string;
  encryption: boolean;
  verification: boolean;
}

export interface DisasterRecoveryDoc {
  rto: string; // Recovery Time Objective
  rpo: string; // Recovery Point Objective
  backup_sites: string[];
  failover_procedure: string[];
  recovery_procedure: string[];
  testing_schedule: string;
}

export interface SettingDoc {
  name: string;
  description: string;
  type: string;
  required: boolean;
  default_value?: any;
  possible_values?: any[];
  examples: any[];
}

export interface ValidationRuleDoc {
  field: string;
  rule: string;
  message: string;
}

/**
 * Deployment Documentation Manager
 *
 * Provides comprehensive documentation generation for deployment configurations,
 * operational procedures, and infrastructure management.
 */
export class DeploymentDocumentationManager {
  private readonly logger = new Logger('DeploymentDocumentationManager');
  private readonly config: DeploymentDocConfig;
  private environments: Map<string, EnvironmentDoc> = new Map();
  private runbooks: Map<string, RunbookEntry> = new Map();
  private troubleshootingGuides: Map<string, TroubleshootingGuide> = new Map();

  constructor(config: Partial<DeploymentDocConfig> = {}) {
    this.config = { ...DEFAULT_DEPLOYMENT_CONFIG, ...config };
    this.logger.log('Initializing Deployment Documentation Manager', {
      outputDirectory: this.config.outputDirectory,
    });
  }

  /**
   * Generate comprehensive deployment documentation
   */
  public async generateDeploymentDocumentation(): Promise<void> {
    this.logger.log('Starting deployment documentation generation');

    try {
      // Ensure output directory exists
      await fs.ensureDir(this.config.outputDirectory);

      // Analyze environment configurations
      await this.analyzeEnvironments();

      // Generate runbooks
      if (this.config.generateRunbooks) {
        await this.generateRunbooks();
      }

      // Generate troubleshooting guides
      if (this.config.generateTroubleshooting) {
        await this.generateTroubleshootingGuides();
      }

      // Generate operational guides
      if (this.config.generateOperationalGuides) {
        await this.generateOperationalGuides();
      }

      // Generate configuration documentation
      if (this.config.generateConfigurationDocs) {
        await this.generateConfigurationDocumentation();
      }

      // Generate environment overviews
      await this.generateEnvironmentOverviews();

      // Generate index files
      await this.generateIndexFiles();

      this.logger.log('Deployment documentation generation completed');

    } catch (error) {
      this.logger.error('Deployment documentation generation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Analyze environment configurations
   */
  private async analyzeEnvironments(): Promise<void> {
    const envFiles = await glob(`${this.config.environmentsDirectory}/**/*.{yml,yaml,json}`);

    for (const envFile of envFiles) {
      try {
        const envDoc = await this.parseEnvironmentFile(envFile);
        if (envDoc) {
          this.environments.set(envDoc.name, envDoc);
        }
      } catch (error) {
        this.logger.warn(`Failed to parse environment file: ${envFile}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.logger.log(`Analyzed ${this.environments.size} environments`);
  }

  /**
   * Parse environment configuration file
   */
  private async parseEnvironmentFile(filePath: string): Promise<EnvironmentDoc | null> {
    const content = await fs.readFile(filePath, 'utf-8');
    const ext = path.extname(filePath);

    let config: any;
    if (ext === '.json') {
      config = JSON.parse(content);
    } else if (ext === '.yml' || ext === '.yaml') {
      config = yaml.load(content);
    } else {
      return null;
    }

    // Transform configuration to EnvironmentDoc
    return this.transformToEnvironmentDoc(config, path.basename(filePath, ext));
  }

  /**
   * Transform configuration object to EnvironmentDoc
   */
  private transformToEnvironmentDoc(config: any, name: string): EnvironmentDoc {
    // This is a simplified transformation - would need to be adapted
    // based on actual configuration structure
    return {
      name,
      description: config.description || '',
      purpose: config.purpose || '',
      infrastructure: config.infrastructure || {},
      services: config.services || [],
      configuration: config.configuration || [],
      secrets: config.secrets || [],
      healthChecks: config.healthChecks || [],
      monitoring: config.monitoring || {},
      backup: config.backup || {},
      disaster_recovery: config.disaster_recovery || {},
    } as EnvironmentDoc;
  }

  /**
   * Generate runbooks for common operations
   */
  private async generateRunbooks(): Promise<void> {
    this.logger.log('Generating runbooks');

    const runbooksDir = path.join(this.config.outputDirectory, 'runbooks');
    await fs.ensureDir(runbooksDir);

    // Generate deployment runbooks
    for (const [envName, env] of this.environments) {
      const deploymentRunbook = this.createDeploymentRunbook(envName, env);
      await this.writeRunbook(runbooksDir, deploymentRunbook);

      const rollbackRunbook = this.createRollbackRunbook(envName, env);
      await this.writeRunbook(runbooksDir, rollbackRunbook);

      const maintenanceRunbook = this.createMaintenanceRunbook(envName, env);
      await this.writeRunbook(runbooksDir, maintenanceRunbook);
    }

    // Generate system-wide runbooks
    const systemRunbooks = this.createSystemRunbooks();
    for (const runbook of systemRunbooks) {
      await this.writeRunbook(runbooksDir, runbook);
    }
  }

  /**
   * Create deployment runbook for environment
   */
  private createDeploymentRunbook(envName: string, env: EnvironmentDoc): RunbookEntry {
    return {
      id: `deployment-${envName}`,
      title: `Deploy to ${envName} Environment`,
      category: 'deployment',
      urgency: envName === 'production' ? 'high' : 'medium',
      description: `Standard deployment procedure for ${envName} environment`,
      prerequisites: [
        'Access to deployment tools',
        'Valid credentials for target environment',
        'Tested application build',
        'Database migrations reviewed',
      ],
      steps: [
        {
          step_number: 1,
          description: 'Verify pre-deployment checklist',
          command: 'npm run deploy:check',
          expected_output: 'All checks passed',
          notes: ['Ensure all tests are passing', 'Verify database migrations'],
        },
        {
          step_number: 2,
          description: 'Deploy application',
          command: `npm run deploy:${envName}`,
          expected_output: 'Deployment successful',
          notes: ['Monitor deployment logs', 'Check application health'],
        },
        {
          step_number: 3,
          description: 'Run smoke tests',
          command: `npm run test:smoke:${envName}`,
          expected_output: 'All smoke tests passed',
          notes: ['Verify critical user flows', 'Check API endpoints'],
        },
      ],
      rollback_steps: [
        {
          step_number: 1,
          description: 'Rollback to previous version',
          command: `npm run deploy:rollback:${envName}`,
          expected_output: 'Rollback successful',
          notes: ['Monitor rollback progress', 'Verify application stability'],
        },
      ],
      validation_steps: [
        {
          step_number: 1,
          description: 'Verify deployment health',
          command: `curl -f https://${envName}-api.example.com/health`,
          expected_output: '{"status":"healthy"}',
          notes: ['Check all service endpoints', 'Verify database connectivity'],
        },
      ],
      automated: true,
      estimated_time: '15-30 minutes',
      contact_info: ['devops-team@example.com', 'on-call-engineer@example.com'],
      last_updated: new Date(),
    };
  }

  /**
   * Create rollback runbook for environment
   */
  private createRollbackRunbook(envName: string, env: EnvironmentDoc): RunbookEntry {
    return {
      id: `rollback-${envName}`,
      title: `Rollback ${envName} Environment`,
      category: 'deployment',
      urgency: 'critical',
      description: `Emergency rollback procedure for ${envName} environment`,
      prerequisites: [
        'Access to deployment tools',
        'Previous deployment version identified',
        'Database rollback plan reviewed',
      ],
      steps: [
        {
          step_number: 1,
          description: 'Stop incoming traffic',
          command: `npm run traffic:stop:${envName}`,
          expected_output: 'Traffic stopped',
          notes: ['Gracefully drain existing connections'],
        },
        {
          step_number: 2,
          description: 'Rollback application',
          command: `npm run deploy:rollback:${envName}`,
          expected_output: 'Rollback successful',
          notes: ['Monitor rollback progress'],
        },
        {
          step_number: 3,
          description: 'Rollback database if needed',
          command: `npm run db:rollback:${envName}`,
          expected_output: 'Database rollback complete',
          notes: ['Only if database changes were deployed'],
        },
        {
          step_number: 4,
          description: 'Resume traffic',
          command: `npm run traffic:resume:${envName}`,
          expected_output: 'Traffic resumed',
          notes: ['Monitor application health'],
        },
      ],
      rollback_steps: [],
      validation_steps: [
        {
          step_number: 1,
          description: 'Verify application health',
          command: `curl -f https://${envName}-api.example.com/health`,
          expected_output: '{"status":"healthy"}',
          notes: ['Ensure all services are responding'],
        },
      ],
      automated: false,
      estimated_time: '10-20 minutes',
      contact_info: ['incident-commander@example.com', 'platform-team@example.com'],
      last_updated: new Date(),
    };
  }

  /**
   * Create maintenance runbook for environment
   */
  private createMaintenanceRunbook(envName: string, env: EnvironmentDoc): RunbookEntry {
    return {
      id: `maintenance-${envName}`,
      title: `Maintenance Mode for ${envName}`,
      category: 'maintenance',
      urgency: 'medium',
      description: `Put ${envName} environment into maintenance mode`,
      prerequisites: [
        'Maintenance window approved',
        'Users notified of downtime',
        'Backup completed',
      ],
      steps: [
        {
          step_number: 1,
          description: 'Enable maintenance mode',
          command: `npm run maintenance:enable:${envName}`,
          expected_output: 'Maintenance mode enabled',
          notes: ['Users will see maintenance page'],
        },
        {
          step_number: 2,
          description: 'Perform maintenance tasks',
          command: 'Execute planned maintenance',
          expected_output: 'Maintenance completed',
          notes: ['Follow specific maintenance procedures'],
        },
        {
          step_number: 3,
          description: 'Disable maintenance mode',
          command: `npm run maintenance:disable:${envName}`,
          expected_output: 'Maintenance mode disabled',
          notes: ['Verify application is accessible'],
        },
      ],
      rollback_steps: [
        {
          step_number: 1,
          description: 'Emergency disable maintenance mode',
          command: `npm run maintenance:force-disable:${envName}`,
          expected_output: 'Maintenance mode disabled',
          notes: ['Use if maintenance needs to be aborted'],
        },
      ],
      validation_steps: [
        {
          step_number: 1,
          description: 'Verify application accessibility',
          command: `curl -f https://${envName}-api.example.com/health`,
          expected_output: '{"status":"healthy"}',
          notes: ['Check all critical user flows'],
        },
      ],
      automated: false,
      estimated_time: 'Variable based on maintenance',
      contact_info: ['maintenance-team@example.com'],
      last_updated: new Date(),
    };
  }

  /**
   * Create system-wide runbooks
   */
  private createSystemRunbooks(): RunbookEntry[] {
    return [
      {
        id: 'security-incident-response',
        title: 'Security Incident Response',
        category: 'troubleshooting',
        urgency: 'critical',
        description: 'Respond to security incidents and breaches',
        prerequisites: ['Security incident detected', 'Incident commander assigned'],
        steps: [
          {
            step_number: 1,
            description: 'Isolate affected systems',
            command: 'npm run security:isolate',
            expected_output: 'Systems isolated',
            notes: ['Prevent further damage'],
          },
          {
            step_number: 2,
            description: 'Assess impact and scope',
            command: 'npm run security:assess',
            expected_output: 'Assessment complete',
            notes: ['Document findings'],
          },
          {
            step_number: 3,
            description: 'Notify stakeholders',
            command: 'Send security notifications',
            expected_output: 'Notifications sent',
            notes: ['Follow notification procedures'],
          },
        ],
        rollback_steps: [],
        validation_steps: [],
        automated: false,
        estimated_time: '1-4 hours',
        contact_info: ['security-team@example.com', 'legal@example.com'],
        last_updated: new Date(),
      },
    ];
  }

  /**
   * Write runbook to file
   */
  private async writeRunbook(runbooksDir: string, runbook: RunbookEntry): Promise<void> {
    const markdown = this.generateRunbookMarkdown(runbook);
    const filePath = path.join(runbooksDir, `${runbook.id}.md`);
    await fs.writeFile(filePath, markdown);
    this.runbooks.set(runbook.id, runbook);
  }

  /**
   * Generate markdown for runbook
   */
  private generateRunbookMarkdown(runbook: RunbookEntry): string {
    let markdown = `# ${runbook.title}\n\n`;
    markdown += `**Category:** ${runbook.category} | **Urgency:** ${runbook.urgency}\n\n`;
    markdown += `${runbook.description}\n\n`;

    if (runbook.prerequisites.length > 0) {
      markdown += `## Prerequisites\n\n`;
      for (const prereq of runbook.prerequisites) {
        markdown += `- ${prereq}\n`;
      }
      markdown += '\n';
    }

    markdown += `## Steps\n\n`;
    for (const step of runbook.steps) {
      markdown += `### ${step.step_number}. ${step.description}\n\n`;
      if (step.command) {
        markdown += `**Command:**\n\`\`\`bash\n${step.command}\n\`\`\`\n\n`;
      }
      if (step.expected_output) {
        markdown += `**Expected Output:** ${step.expected_output}\n\n`;
      }
      if (step.notes.length > 0) {
        markdown += `**Notes:**\n`;
        for (const note of step.notes) {
          markdown += `- ${note}\n`;
        }
        markdown += '\n';
      }
    }

    if (runbook.rollback_steps.length > 0) {
      markdown += `## Rollback Steps\n\n`;
      for (const step of runbook.rollback_steps) {
        markdown += `### ${step.step_number}. ${step.description}\n\n`;
        if (step.command) {
          markdown += `**Command:**\n\`\`\`bash\n${step.command}\n\`\`\`\n\n`;
        }
      }
    }

    if (runbook.validation_steps.length > 0) {
      markdown += `## Validation\n\n`;
      for (const step of runbook.validation_steps) {
        markdown += `### ${step.step_number}. ${step.description}\n\n`;
        if (step.command) {
          markdown += `**Command:**\n\`\`\`bash\n${step.command}\n\`\`\`\n\n`;
        }
      }
    }

    markdown += `## Additional Information\n\n`;
    markdown += `- **Estimated Time:** ${runbook.estimated_time}\n`;
    markdown += `- **Automated:** ${runbook.automated ? 'Yes' : 'No'}\n`;
    markdown += `- **Last Updated:** ${runbook.last_updated.toISOString()}\n\n`;

    if (runbook.contact_info.length > 0) {
      markdown += `**Contacts:**\n`;
      for (const contact of runbook.contact_info) {
        markdown += `- ${contact}\n`;
      }
    }

    return markdown;
  }

  /**
   * Generate troubleshooting guides
   */
  private async generateTroubleshootingGuides(): Promise<void> {
    this.logger.log('Generating troubleshooting guides');

    const troubleshootingDir = path.join(this.config.outputDirectory, 'troubleshooting');
    await fs.ensureDir(troubleshootingDir);

    const guides = this.createTroubleshootingGuides();
    for (const guide of guides) {
      const markdown = this.generateTroubleshootingMarkdown(guide);
      const filePath = path.join(troubleshootingDir, `${guide.id}.md`);
      await fs.writeFile(filePath, markdown);
      this.troubleshootingGuides.set(guide.id, guide);
    }
  }

  /**
   * Create troubleshooting guides
   */
  private createTroubleshootingGuides(): TroubleshootingGuide[] {
    return [
      {
        id: 'high-cpu-usage',
        title: 'High CPU Usage',
        category: 'Performance',
        symptoms: [
          'Application response time increased',
          'CPU usage above 80% for extended period',
          'High system load average',
        ],
        possible_causes: [
          'Memory leak causing garbage collection overhead',
          'Inefficient database queries',
          'High concurrent user load',
          'Infinite loops in application code',
        ],
        diagnostic_steps: [
          {
            step: 'Check current CPU usage',
            command: 'top -p $(pgrep node)',
            expected_output: 'Process CPU usage details',
            interpretation: 'Look for processes consuming >50% CPU',
            next_steps: ['Identify high CPU processes'],
          },
          {
            step: 'Check system load',
            command: 'uptime',
            expected_output: 'Load averages',
            interpretation: 'Load > number of CPUs indicates overload',
            next_steps: ['Investigate load sources'],
          },
        ],
        solutions: [
          {
            step: 'Restart application service',
            description: 'Quick fix for memory leaks',
            commands: ['sudo systemctl restart application'],
            verification: 'CPU usage returns to normal levels',
            rollback: ['sudo systemctl start application'],
            risk_level: 'medium',
          },
          {
            step: 'Scale application horizontally',
            description: 'Add more application instances',
            commands: ['kubectl scale deployment app --replicas=5'],
            verification: 'Load distributed across instances',
            rollback: ['kubectl scale deployment app --replicas=3'],
            risk_level: 'low',
          },
        ],
        prevention: [
          'Implement proper monitoring and alerting',
          'Regular performance testing',
          'Code review for performance issues',
          'Automated scaling policies',
        ],
        escalation_path: [
          'Platform Engineering Team',
          'Senior DevOps Engineer',
          'CTO',
        ],
        related_issues: ['memory-leak', 'database-performance'],
      },
    ];
  }

  /**
   * Generate troubleshooting markdown
   */
  private generateTroubleshootingMarkdown(guide: TroubleshootingGuide): string {
    let markdown = `# ${guide.title}\n\n`;
    markdown += `**Category:** ${guide.category}\n\n`;

    markdown += `## Symptoms\n\n`;
    for (const symptom of guide.symptoms) {
      markdown += `- ${symptom}\n`;
    }
    markdown += '\n';

    markdown += `## Possible Causes\n\n`;
    for (const cause of guide.possible_causes) {
      markdown += `- ${cause}\n`;
    }
    markdown += '\n';

    markdown += `## Diagnostic Steps\n\n`;
    for (const step of guide.diagnostic_steps) {
      markdown += `### ${step.step}\n\n`;
      markdown += `**Command:**\n\`\`\`bash\n${step.command}\n\`\`\`\n\n`;
      markdown += `**Expected Output:** ${step.expected_output}\n\n`;
      markdown += `**Interpretation:** ${step.interpretation}\n\n`;
    }

    markdown += `## Solutions\n\n`;
    for (const solution of guide.solutions) {
      markdown += `### ${solution.step}\n\n`;
      markdown += `${solution.description}\n\n`;
      markdown += `**Risk Level:** ${solution.risk_level}\n\n`;
      markdown += `**Commands:**\n\`\`\`bash\n${solution.commands.join('\n')}\n\`\`\`\n\n`;
      markdown += `**Verification:** ${solution.verification}\n\n`;
    }

    return markdown;
  }

  /**
   * Generate operational guides
   */
  private async generateOperationalGuides(): Promise<void> {
    this.logger.log('Generating operational guides');

    const operationsDir = path.join(this.config.outputDirectory, 'operations');
    await fs.ensureDir(operationsDir);

    // Generate monitoring guide
    const monitoringGuide = this.generateMonitoringGuide();
    await fs.writeFile(path.join(operationsDir, 'monitoring.md'), monitoringGuide);

    // Generate backup and recovery guide
    const backupGuide = this.generateBackupGuide();
    await fs.writeFile(path.join(operationsDir, 'backup-recovery.md'), backupGuide);

    // Generate security operations guide
    const securityGuide = this.generateSecurityGuide();
    await fs.writeFile(path.join(operationsDir, 'security-operations.md'), securityGuide);
  }

  /**
   * Generate monitoring guide
   */
  private generateMonitoringGuide(): string {
    return `# Monitoring and Observability Guide

## Overview

This guide covers monitoring, alerting, and observability practices for the AIgent platform.

## Key Metrics

### Application Metrics
- **Response Time**: Target < 200ms for 95th percentile
- **Error Rate**: Target < 0.1% for critical paths
- **Throughput**: Requests per second
- **Availability**: Target 99.9% uptime

### Infrastructure Metrics
- **CPU Usage**: Alert at > 80%
- **Memory Usage**: Alert at > 85%
- **Disk Usage**: Alert at > 80%
- **Network I/O**: Monitor bandwidth utilization

## Dashboards

### Application Dashboard
- Response time trends
- Error rate by endpoint
- Request volume by service
- User session metrics

### Infrastructure Dashboard
- Resource utilization
- Service health status
- Database performance
- Cache hit rates

## Alert Configuration

### Critical Alerts
- Service down (immediate notification)
- High error rate (5-minute notification)
- Database connectivity issues (immediate notification)

### Warning Alerts
- High CPU usage (15-minute notification)
- Memory usage trends (30-minute notification)
- Slow response times (10-minute notification)

## Log Management

### Log Levels
- **ERROR**: Application errors requiring attention
- **WARN**: Potential issues or degraded performance
- **INFO**: Normal application flow and business events
- **DEBUG**: Detailed information for troubleshooting

### Log Retention
- **ERROR logs**: 90 days
- **WARN logs**: 30 days
- **INFO logs**: 14 days
- **DEBUG logs**: 7 days

## Incident Response

### Severity Levels
1. **P0 (Critical)**: Complete service outage
2. **P1 (High)**: Major feature unavailable
3. **P2 (Medium)**: Minor feature degraded
4. **P3 (Low)**: Cosmetic or documentation issues

### Response Times
- **P0**: 15 minutes
- **P1**: 1 hour
- **P2**: 4 hours
- **P3**: Next business day
`;
  }

  /**
   * Generate backup guide
   */
  private generateBackupGuide(): string {
    return `# Backup and Recovery Guide

## Backup Strategy

### Database Backups
- **Frequency**: Daily at 2:00 AM UTC
- **Retention**: 30 days for daily, 12 months for monthly
- **Verification**: Automated restore testing weekly

### Application Data Backups
- **Frequency**: Every 6 hours
- **Retention**: 7 days for incremental, 30 days for full
- **Verification**: Checksum validation

### Configuration Backups
- **Frequency**: Before each deployment
- **Retention**: Last 10 configurations
- **Storage**: Version control system

## Recovery Procedures

### Database Recovery
1. Stop application services
2. Restore database from backup
3. Verify data integrity
4. Start application services
5. Validate application functionality

### Point-in-Time Recovery
1. Identify recovery point
2. Restore base backup
3. Apply transaction logs
4. Verify data consistency
5. Resume operations

## Testing

### Backup Testing
- Monthly restore tests in isolated environment
- Quarterly disaster recovery drills
- Annual full system recovery test

### Recovery Time Objectives
- **Database**: RTO 1 hour, RPO 1 hour
- **Application**: RTO 30 minutes, RPO 15 minutes
- **Configuration**: RTO 15 minutes, RPO 0
`;
  }

  /**
   * Generate security guide
   */
  private generateSecurityGuide(): string {
    return `# Security Operations Guide

## Security Monitoring

### Log Sources
- Application security events
- Authentication and authorization
- Network traffic analysis
- System access logs

### Security Metrics
- Failed login attempts
- Privilege escalations
- Unusual access patterns
- Data export activities

## Incident Response

### Security Incident Classification
- **Critical**: Active breach or data compromise
- **High**: Attempted breach or vulnerability exploitation
- **Medium**: Policy violations or suspicious activity
- **Low**: False positives or minor policy violations

### Response Procedures
1. **Containment**: Isolate affected systems
2. **Investigation**: Analyze logs and evidence
3. **Eradication**: Remove threats and vulnerabilities
4. **Recovery**: Restore services safely
5. **Lessons Learned**: Document and improve

## Access Management

### Principle of Least Privilege
- Users have minimum required permissions
- Regular access reviews and audits
- Automated deprovisioning for terminated users

### Multi-Factor Authentication
- Required for all administrative access
- Required for production system access
- Regular review of MFA devices

## Vulnerability Management

### Scanning
- Weekly automated vulnerability scans
- Monthly penetration testing
- Quarterly security assessments

### Patch Management
- Critical patches within 72 hours
- High-risk patches within 7 days
- Medium-risk patches within 30 days
- Low-risk patches during next maintenance window
`;
  }

  /**
   * Generate configuration documentation
   */
  private async generateConfigurationDocumentation(): Promise<void> {
    this.logger.log('Generating configuration documentation');

    const configDir = path.join(this.config.outputDirectory, 'configuration');
    await fs.ensureDir(configDir);

    for (const [envName, env] of this.environments) {
      const configDoc = this.generateEnvironmentConfigDoc(envName, env);
      await fs.writeFile(path.join(configDir, `${envName}-config.md`), configDoc);
    }
  }

  /**
   * Generate environment configuration documentation
   */
  private generateEnvironmentConfigDoc(envName: string, env: EnvironmentDoc): string {
    let markdown = `# ${envName} Environment Configuration\n\n`;
    markdown += `${env.description}\n\n`;

    if (env.configuration.length > 0) {
      markdown += `## Configuration Files\n\n`;
      for (const config of env.configuration) {
        markdown += `### ${config.file}\n\n`;
        markdown += `**Format:** ${config.format}\n`;
        markdown += `**Required:** ${config.required ? 'Yes' : 'No'}\n`;
        markdown += `**Sensitive:** ${config.sensitive ? 'Yes' : 'No'}\n\n`;
        markdown += `${config.description}\n\n`;

        if (config.settings.length > 0) {
          markdown += `#### Settings\n\n`;
          markdown += `| Setting | Type | Required | Default | Description |\n`;
          markdown += `|---------|------|----------|---------|-------------|\n`;

          for (const setting of config.settings) {
            markdown += `| ${setting.name} | ${setting.type} | ${setting.required ? 'Yes' : 'No'} | ${setting.default_value || 'N/A'} | ${setting.description} |\n`;
          }
          markdown += '\n';
        }
      }
    }

    return markdown;
  }

  /**
   * Generate environment overviews
   */
  private async generateEnvironmentOverviews(): Promise<void> {
    this.logger.log('Generating environment overviews');

    const environmentsDir = path.join(this.config.outputDirectory, 'environments');
    await fs.ensureDir(environmentsDir);

    for (const [envName, env] of this.environments) {
      const overview = this.generateEnvironmentOverview(envName, env);
      await fs.writeFile(path.join(environmentsDir, `${envName}.md`), overview);
    }
  }

  /**
   * Generate environment overview
   */
  private generateEnvironmentOverview(envName: string, env: EnvironmentDoc): string {
    let markdown = `# ${envName} Environment Overview\n\n`;
    markdown += `**Purpose:** ${env.purpose}\n\n`;
    markdown += `${env.description}\n\n`;

    // Infrastructure section
    if (env.infrastructure) {
      markdown += `## Infrastructure\n\n`;
      markdown += `**Provider:** ${env.infrastructure.provider}\n`;
      markdown += `**Region:** ${env.infrastructure.region}\n\n`;

      if (env.infrastructure.compute?.length > 0) {
        markdown += `### Compute Resources\n\n`;
        markdown += `| Type | Size | Count | Autoscaling |\n`;
        markdown += `|------|------|-------|-------------|\n`;
        for (const compute of env.infrastructure.compute) {
          markdown += `| ${compute.type} | ${compute.size} | ${compute.count} | ${compute.autoscaling ? 'Yes' : 'No'} |\n`;
        }
        markdown += '\n';
      }
    }

    // Services section
    if (env.services.length > 0) {
      markdown += `## Services\n\n`;
      for (const service of env.services) {
        markdown += `### ${service.name}\n\n`;
        markdown += `**Type:** ${service.type}\n`;
        markdown += `**Version:** ${service.version}\n`;
        markdown += `**Port:** ${service.port}\n\n`;
        markdown += `${service.description}\n\n`;

        if (service.endpoints.length > 0) {
          markdown += `**Endpoints:**\n`;
          for (const endpoint of service.endpoints) {
            markdown += `- ${endpoint}\n`;
          }
          markdown += '\n';
        }
      }
    }

    return markdown;
  }

  /**
   * Generate index files
   */
  private async generateIndexFiles(): Promise<void> {
    this.logger.log('Generating index files');

    // Main index file
    const mainIndex = this.generateMainIndex();
    await fs.writeFile(path.join(this.config.outputDirectory, 'README.md'), mainIndex);

    // Runbooks index
    const runbooksIndex = this.generateRunbooksIndex();
    await fs.writeFile(path.join(this.config.outputDirectory, 'runbooks', 'README.md'), runbooksIndex);

    // Troubleshooting index
    const troubleshootingIndex = this.generateTroubleshootingIndex();
    await fs.writeFile(path.join(this.config.outputDirectory, 'troubleshooting', 'README.md'), troubleshootingIndex);
  }

  /**
   * Generate main index
   */
  private generateMainIndex(): string {
    return `# Deployment Documentation

This directory contains comprehensive deployment and operational documentation for the AIgent platform.

## Structure

- **[Environments](./environments/)** - Environment-specific documentation
- **[Runbooks](./runbooks/)** - Step-by-step operational procedures
- **[Troubleshooting](./troubleshooting/)** - Problem diagnosis and resolution guides
- **[Operations](./operations/)** - General operational guides and procedures
- **[Configuration](./configuration/)** - Configuration management documentation

## Quick Links

### Emergency Procedures
- [Security Incident Response](./runbooks/security-incident-response.md)
- [Production Rollback](./runbooks/rollback-production.md)
- [High CPU Usage](./troubleshooting/high-cpu-usage.md)

### Regular Operations
- [Deployment Procedures](./runbooks/)
- [Monitoring Guide](./operations/monitoring.md)
- [Backup and Recovery](./operations/backup-recovery.md)

### Environment Information
- [Production Environment](./environments/production.md)
- [Staging Environment](./environments/staging.md)
- [Development Environment](./environments/development.md)

## Getting Help

For additional support:
- Platform Engineering Team: platform-engineering@example.com
- DevOps Team: devops@example.com
- Security Team: security@example.com
- On-call Engineer: on-call@example.com

Last updated: ${new Date().toISOString()}
`;
  }

  /**
   * Generate runbooks index
   */
  private generateRunbooksIndex(): string {
    let markdown = `# Runbooks Index\n\n`;
    markdown += `Operational runbooks for the AIgent platform.\n\n`;

    const runbooksByCategory = new Map<string, RunbookEntry[]>();
    for (const runbook of this.runbooks.values()) {
      const categoryRunbooks = runbooksByCategory.get(runbook.category) || [];
      categoryRunbooks.push(runbook);
      runbooksByCategory.set(runbook.category, categoryRunbooks);
    }

    for (const [category, runbooks] of runbooksByCategory) {
      markdown += `## ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
      for (const runbook of runbooks) {
        markdown += `- [${runbook.title}](./${runbook.id}.md) - ${runbook.description}\n`;
      }
      markdown += '\n';
    }

    return markdown;
  }

  /**
   * Generate troubleshooting index
   */
  private generateTroubleshootingIndex(): string {
    let markdown = `# Troubleshooting Index\n\n`;
    markdown += `Problem diagnosis and resolution guides.\n\n`;

    const guidesByCategory = new Map<string, TroubleshootingGuide[]>();
    for (const guide of this.troubleshootingGuides.values()) {
      const categoryGuides = guidesByCategory.get(guide.category) || [];
      categoryGuides.push(guide);
      guidesByCategory.set(guide.category, categoryGuides);
    }

    for (const [category, guides] of guidesByCategory) {
      markdown += `## ${category}\n\n`;
      for (const guide of guides) {
        markdown += `- [${guide.title}](./${guide.id}.md)\n`;
      }
      markdown += '\n';
    }

    return markdown;
  }
}

export default {
  DeploymentDocumentationManager,
  DEFAULT_DEPLOYMENT_CONFIG,
};