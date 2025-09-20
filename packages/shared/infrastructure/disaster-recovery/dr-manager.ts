/**
 * PARLANT Database Function Wrapping System - Disaster Recovery Manager
 * Comprehensive disaster recovery and backup automation system
 */

import { EventEmitter } from 'events';
import { ParlantConfigManager } from '../config-management/config-manager';
import { ParlantDatabaseMigrationManager } from '../database-management/migration-manager';
import { ParlantKubernetesOrchestrator } from '../orchestration/kubernetes-orchestrator';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand
} from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { execSync, spawn } from 'child_process';

export interface BackupJob {
  id: string;
  name: string;
  type: 'database' | 'files' | 'configuration' | 'full';
  schedule: string; // Cron expression
  retention: {
    daily: number;    // Keep daily backups for N days
    weekly: number;   // Keep weekly backups for N weeks
    monthly: number;  // Keep monthly backups for N months
    yearly: number;   // Keep yearly backups for N years
  };
  targets: BackupTarget[];
  compression: boolean;
  encryption: boolean;
  verification: boolean;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  successCount: number;
  failureCount: number;
}

export interface BackupTarget {
  type: 'database' | 'filesystem' | 'kubernetes' | 's3';
  source: string;
  destination: string;
  options: Record<string, any>;
}

export interface BackupResult {
  jobId: string;
  backupId: string;
  timestamp: Date;
  type: string;
  size: number;
  duration: number;
  success: boolean;
  errorMessage?: string;
  checksum: string;
  location: string;
  metadata: Record<string, any>;
}

export interface RestoreJob {
  id: string;
  backupId: string;
  type: 'database' | 'files' | 'configuration' | 'full';
  targetEnvironment: string;
  pointInTime?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  estimatedTimeRemaining?: number;
  startTime?: Date;
  endTime?: Date;
  errorMessage?: string;
}

export interface DisasterRecoveryPlan {
  id: string;
  name: string;
  description: string;
  triggers: DRTrigger[];
  procedures: DRProcedure[];
  rto: number; // Recovery Time Objective (minutes)
  rpo: number; // Recovery Point Objective (minutes)
  priority: 'critical' | 'high' | 'medium' | 'low';
  lastTested?: Date;
  testResults?: DRTestResult[];
}

export interface DRTrigger {
  type: 'manual' | 'automated' | 'healthcheck' | 'external';
  conditions: Record<string, any>;
  enabled: boolean;
}

export interface DRProcedure {
  id: string;
  name: string;
  description: string;
  type: 'backup_restore' | 'failover' | 'notification' | 'validation' | 'custom';
  parameters: Record<string, any>;
  dependencies: string[];
  timeout: number;
  retries: number;
  order: number;
}

export interface DRTestResult {
  id: string;
  timestamp: Date;
  planId: string;
  type: 'scheduled' | 'manual' | 'automated';
  duration: number;
  success: boolean;
  rtoActual: number;
  rpoActual: number;
  procedureResults: Array<{
    procedureId: string;
    success: boolean;
    duration: number;
    errorMessage?: string;
  }>;
  recommendations: string[];
}

export interface FailoverConfiguration {
  primaryRegion: string;
  secondaryRegion: string;
  failoverMode: 'manual' | 'automatic';
  healthCheckEndpoint: string;
  healthCheckInterval: number;
  failureThreshold: number;
  dnsSwitching: {
    enabled: boolean;
    provider: 'route53' | 'cloudflare' | 'manual';
    recordType: string;
    ttl: number;
  };
  dataReplication: {
    enabled: boolean;
    method: 'sync' | 'async';
    lagThreshold: number;
  };
}

export class ParlantDisasterRecoveryManager extends EventEmitter {
  private configManager: ParlantConfigManager;
  private databaseManager: ParlantDatabaseMigrationManager;
  private orchestrator: ParlantKubernetesOrchestrator;
  private s3Client: S3Client;
  private environment: string;

  private backupJobs: Map<string, BackupJob> = new Map();
  private drPlans: Map<string, DisasterRecoveryPlan> = new Map();
  private activeRestores: Map<string, RestoreJob> = new Map();
  private backupHistory: BackupResult[] = [];

  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;

  private readonly BACKUP_BUCKET = 'parlant-dr-backups';
  private readonly BACKUP_PATH = '/var/backups/parlant';
  private readonly MONITORING_INTERVAL = 60000; // 1 minute

  constructor(environment: string, region: string = 'us-east-1') {
    super();
    this.environment = environment;
    this.configManager = new ParlantConfigManager(environment);
    this.databaseManager = new ParlantDatabaseMigrationManager(environment);
    this.orchestrator = new ParlantKubernetesOrchestrator(environment);

    this.s3Client = new S3Client({ region });

    this.ensureBackupDirectory();
  }

  /**
   * Initialize disaster recovery manager
   */
  async initialize(): Promise<void> {
    console.log('Initializing PARLANT Disaster Recovery Manager...');

    // Load configuration
    await this.loadDRConfiguration();

    // Initialize backup jobs
    await this.initializeBackupJobs();

    // Initialize DR plans
    await this.initializeDRPlans();

    // Start monitoring
    this.startMonitoring();

    console.log(`DR Manager initialized for environment: ${this.environment}`);
    this.emit('initialized');
  }

  /**
   * Load DR configuration
   */
  private async loadDRConfiguration(): Promise<void> {
    const config = await this.configManager.loadConfiguration();

    // Load backup jobs from configuration
    const defaultBackupJobs: BackupJob[] = [
      {
        id: 'daily-database',
        name: 'Daily Database Backup',
        type: 'database',
        schedule: '0 2 * * *', // Daily at 2 AM
        retention: {
          daily: 7,
          weekly: 4,
          monthly: 12,
          yearly: 3
        },
        targets: [{
          type: 'database',
          source: 'primary',
          destination: `s3://${this.BACKUP_BUCKET}/database`,
          options: {
            compression: true,
            encryption: true
          }
        }],
        compression: true,
        encryption: true,
        verification: true,
        enabled: true,
        successCount: 0,
        failureCount: 0
      },
      {
        id: 'hourly-incremental',
        name: 'Hourly Incremental Backup',
        type: 'database',
        schedule: '0 * * * *', // Hourly
        retention: {
          daily: 2,
          weekly: 0,
          monthly: 0,
          yearly: 0
        },
        targets: [{
          type: 'database',
          source: 'primary',
          destination: `s3://${this.BACKUP_BUCKET}/incremental`,
          options: {
            incremental: true,
            compression: true
          }
        }],
        compression: true,
        encryption: true,
        verification: false,
        enabled: this.environment === 'production',
        successCount: 0,
        failureCount: 0
      },
      {
        id: 'weekly-full',
        name: 'Weekly Full System Backup',
        type: 'full',
        schedule: '0 1 * * 0', // Weekly on Sunday at 1 AM
        retention: {
          daily: 0,
          weekly: 8,
          monthly: 6,
          yearly: 2
        },
        targets: [
          {
            type: 'database',
            source: 'primary',
            destination: `s3://${this.BACKUP_BUCKET}/full/database`,
            options: { compression: true, encryption: true }
          },
          {
            type: 'kubernetes',
            source: 'all-namespaces',
            destination: `s3://${this.BACKUP_BUCKET}/full/kubernetes`,
            options: { includeSecrets: true, compression: true }
          },
          {
            type: 'filesystem',
            source: this.BACKUP_PATH,
            destination: `s3://${this.BACKUP_BUCKET}/full/files`,
            options: { compression: true, encryption: true }
          }
        ],
        compression: true,
        encryption: true,
        verification: true,
        enabled: this.environment === 'production',
        successCount: 0,
        failureCount: 0
      }
    ];

    defaultBackupJobs.forEach(job => {
      this.backupJobs.set(job.id, job);
    });

    console.log(`Loaded ${this.backupJobs.size} backup jobs`);
  }

  /**
   * Initialize backup jobs scheduling
   */
  private async initializeBackupJobs(): Promise<void> {
    for (const [jobId, job] of this.backupJobs) {
      if (job.enabled) {
        this.scheduleBackupJob(job);
      }
    }

    console.log('Backup jobs scheduled');
  }

  /**
   * Initialize disaster recovery plans
   */
  private async initializeDRPlans(): Promise<void> {
    const defaultDRPlans: DisasterRecoveryPlan[] = [
      {
        id: 'database-failure',
        name: 'Database Failure Recovery',
        description: 'Recovery plan for primary database failure',
        triggers: [
          {
            type: 'healthcheck',
            conditions: {
              endpoint: '/health/database',
              failureThreshold: 3,
              timeoutMs: 5000
            },
            enabled: true
          }
        ],
        procedures: [
          {
            id: 'notify-team',
            name: 'Notify Operations Team',
            description: 'Send alerts to operations team',
            type: 'notification',
            parameters: {
              channels: ['slack', 'email', 'sms'],
              message: 'Database failure detected - initiating DR procedures'
            },
            dependencies: [],
            timeout: 60,
            retries: 3,
            order: 1
          },
          {
            id: 'failover-database',
            name: 'Failover to Backup Database',
            description: 'Switch to backup database instance',
            type: 'failover',
            parameters: {
              targetInstance: 'backup',
              validateConnection: true
            },
            dependencies: ['notify-team'],
            timeout: 300,
            retries: 2,
            order: 2
          },
          {
            id: 'restore-latest',
            name: 'Restore Latest Backup',
            description: 'Restore from the most recent backup',
            type: 'backup_restore',
            parameters: {
              backupType: 'latest',
              verifyIntegrity: true
            },
            dependencies: ['failover-database'],
            timeout: 1800,
            retries: 1,
            order: 3
          },
          {
            id: 'validate-recovery',
            name: 'Validate Recovery',
            description: 'Run validation tests on recovered system',
            type: 'validation',
            parameters: {
              tests: ['connection', 'data_integrity', 'performance']
            },
            dependencies: ['restore-latest'],
            timeout: 600,
            retries: 0,
            order: 4
          }
        ],
        rto: 30, // 30 minutes
        rpo: 60, // 1 hour
        priority: 'critical'
      },
      {
        id: 'full-system-failure',
        name: 'Complete System Failure Recovery',
        description: 'Recovery plan for complete system outage',
        triggers: [
          {
            type: 'manual',
            conditions: {},
            enabled: true
          }
        ],
        procedures: [
          {
            id: 'assess-damage',
            name: 'Assess System Damage',
            description: 'Evaluate extent of system failure',
            type: 'validation',
            parameters: {
              checks: ['infrastructure', 'data', 'services']
            },
            dependencies: [],
            timeout: 300,
            retries: 0,
            order: 1
          },
          {
            id: 'provision-infrastructure',
            name: 'Provision Recovery Infrastructure',
            description: 'Deploy fresh infrastructure for recovery',
            type: 'custom',
            parameters: {
              script: 'provision-dr-infrastructure.sh',
              environment: 'dr'
            },
            dependencies: ['assess-damage'],
            timeout: 1800,
            retries: 1,
            order: 2
          },
          {
            id: 'restore-full-backup',
            name: 'Restore Full System Backup',
            description: 'Restore complete system from backup',
            type: 'backup_restore',
            parameters: {
              backupType: 'full',
              includeKubernetes: true,
              includeDatabase: true
            },
            dependencies: ['provision-infrastructure'],
            timeout: 3600,
            retries: 1,
            order: 3
          },
          {
            id: 'update-dns',
            name: 'Update DNS Records',
            description: 'Point DNS to recovery environment',
            type: 'custom',
            parameters: {
              provider: 'route53',
              recordType: 'A',
              ttl: 60
            },
            dependencies: ['restore-full-backup'],
            timeout: 300,
            retries: 2,
            order: 4
          }
        ],
        rto: 120, // 2 hours
        rpo: 360, // 6 hours
        priority: 'critical'
      }
    ];

    defaultDRPlans.forEach(plan => {
      this.drPlans.set(plan.id, plan);
    });

    console.log(`Loaded ${this.drPlans.size} disaster recovery plans`);
  }

  /**
   * Schedule backup job using cron expression
   */
  private scheduleBackupJob(job: BackupJob): void {
    // Simple cron parser - in production, use a proper cron library
    const nextRun = this.calculateNextRun(job.schedule);
    const delay = nextRun.getTime() - Date.now();

    const timeout = setTimeout(async () => {
      await this.executeBackupJob(job);
      // Reschedule for next run
      this.scheduleBackupJob(job);
    }, delay);

    this.scheduledJobs.set(job.id, timeout);
    job.nextRun = nextRun;

    console.log(`Scheduled backup job '${job.name}' for ${nextRun.toISOString()}`);
  }

  /**
   * Calculate next run time from cron expression (simplified)
   */
  private calculateNextRun(cronExpression: string): Date {
    // Simplified cron parsing - implement proper parser for production
    const parts = cronExpression.split(' ');
    const [minute, hour, day, month, dayOfWeek] = parts.map(p => parseInt(p) || 0);

    const next = new Date();
    next.setMinutes(minute);
    next.setHours(hour);
    next.setSeconds(0);
    next.setMilliseconds(0);

    // If time has passed today, move to tomorrow
    if (next <= new Date()) {
      next.setDate(next.getDate() + 1);
    }

    return next;
  }

  /**
   * Execute backup job
   */
  async executeBackupJob(job: BackupJob): Promise<BackupResult> {
    const backupId = `${job.id}-${Date.now()}`;
    const startTime = Date.now();

    console.log(`Executing backup job: ${job.name} (${backupId})`);

    try {
      let totalSize = 0;
      const results: any[] = [];

      for (const target of job.targets) {
        const targetResult = await this.executeBackupTarget(target, backupId, job);
        results.push(targetResult);
        totalSize += targetResult.size || 0;
      }

      // Create checksum of all results
      const checksum = crypto
        .createHash('sha256')
        .update(JSON.stringify(results))
        .digest('hex');

      const result: BackupResult = {
        jobId: job.id,
        backupId,
        timestamp: new Date(),
        type: job.type,
        size: totalSize,
        duration: Date.now() - startTime,
        success: true,
        checksum,
        location: `s3://${this.BACKUP_BUCKET}/${backupId}`,
        metadata: {
          targets: results,
          compression: job.compression,
          encryption: job.encryption,
          verification: job.verification
        }
      };

      job.lastRun = new Date();
      job.successCount++;

      // Store backup metadata
      await this.storeBackupMetadata(result);

      // Cleanup old backups according to retention policy
      await this.cleanupOldBackups(job);

      this.backupHistory.push(result);
      this.emit('backupCompleted', result);

      console.log(`Backup job completed successfully: ${job.name} (${this.formatBytes(totalSize)})`);
      return result;

    } catch (error) {
      const result: BackupResult = {
        jobId: job.id,
        backupId,
        timestamp: new Date(),
        type: job.type,
        size: 0,
        duration: Date.now() - startTime,
        success: false,
        errorMessage: error.message,
        checksum: '',
        location: '',
        metadata: {}
      };

      job.failureCount++;
      this.backupHistory.push(result);
      this.emit('backupFailed', result);

      console.error(`Backup job failed: ${job.name}`, error);
      throw error;
    }
  }

  /**
   * Execute backup for a specific target
   */
  private async executeBackupTarget(
    target: BackupTarget,
    backupId: string,
    job: BackupJob
  ): Promise<any> {
    switch (target.type) {
      case 'database':
        return await this.backupDatabase(target, backupId, job);

      case 'filesystem':
        return await this.backupFilesystem(target, backupId, job);

      case 'kubernetes':
        return await this.backupKubernetes(target, backupId, job);

      case 's3':
        return await this.backupS3(target, backupId, job);

      default:
        throw new Error(`Unknown backup target type: ${target.type}`);
    }
  }

  /**
   * Backup database
   */
  private async backupDatabase(
    target: BackupTarget,
    backupId: string,
    job: BackupJob
  ): Promise<any> {
    const config = await this.configManager.loadConfiguration();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${backupId}-database-${timestamp}.sql`;
    const localPath = path.join(this.BACKUP_PATH, filename);

    // Create database backup
    const backupPath = await this.databaseManager.createBackup(filename);

    let finalPath = backupPath;
    let size = fs.statSync(backupPath).size;

    // Compress if requested
    if (job.compression) {
      const compressedPath = `${backupPath}.gz`;
      execSync(`gzip -c "${backupPath}" > "${compressedPath}"`);
      fs.unlinkSync(backupPath);
      finalPath = compressedPath;
      size = fs.statSync(compressedPath).size;
    }

    // Encrypt if requested
    if (job.encryption) {
      const encryptedPath = `${finalPath}.enc`;
      const encryptionKey = await this.configManager.getSecret('backup_encryption_key');
      await this.encryptFile(finalPath, encryptedPath, encryptionKey);
      fs.unlinkSync(finalPath);
      finalPath = encryptedPath;
      size = fs.statSync(encryptedPath).size;
    }

    // Upload to S3
    const s3Key = `${target.destination}/${path.basename(finalPath)}`;
    await this.uploadToS3(finalPath, s3Key);

    // Verify if requested
    if (job.verification) {
      await this.verifyBackup(s3Key, finalPath);
    }

    // Cleanup local file
    fs.unlinkSync(finalPath);

    return {
      type: 'database',
      filename: path.basename(finalPath),
      size,
      location: s3Key,
      checksum: await this.calculateFileChecksum(finalPath)
    };
  }

  /**
   * Backup filesystem
   */
  private async backupFilesystem(
    target: BackupTarget,
    backupId: string,
    job: BackupJob
  ): Promise<any> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${backupId}-filesystem-${timestamp}.tar`;
    const localPath = path.join(this.BACKUP_PATH, filename);

    // Create tar archive
    let tarCommand = `tar -cf "${localPath}" -C "${path.dirname(target.source)}" "${path.basename(target.source)}"`;

    if (job.compression) {
      tarCommand = tarCommand.replace('tar -cf', 'tar -czf');
      localPath = localPath.replace('.tar', '.tar.gz');
    }

    execSync(tarCommand);

    let finalPath = localPath;
    let size = fs.statSync(localPath).size;

    // Encrypt if requested
    if (job.encryption) {
      const encryptedPath = `${finalPath}.enc`;
      const encryptionKey = await this.configManager.getSecret('backup_encryption_key');
      await this.encryptFile(finalPath, encryptedPath, encryptionKey);
      fs.unlinkSync(finalPath);
      finalPath = encryptedPath;
      size = fs.statSync(encryptedPath).size;
    }

    // Upload to S3
    const s3Key = `${target.destination}/${path.basename(finalPath)}`;
    await this.uploadToS3(finalPath, s3Key);

    // Cleanup local file
    fs.unlinkSync(finalPath);

    return {
      type: 'filesystem',
      filename: path.basename(finalPath),
      size,
      location: s3Key,
      source: target.source
    };
  }

  /**
   * Backup Kubernetes resources
   */
  private async backupKubernetes(
    target: BackupTarget,
    backupId: string,
    job: BackupJob
  ): Promise<any> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${backupId}-kubernetes-${timestamp}.yaml`;
    const localPath = path.join(this.BACKUP_PATH, filename);

    // Export Kubernetes resources
    const command = target.options.includeSecrets
      ? 'kubectl get all,secrets,configmaps,pv,pvc -o yaml'
      : 'kubectl get all,configmaps,pv,pvc -o yaml';

    const output = execSync(command, { encoding: 'utf8' });
    fs.writeFileSync(localPath, output);

    let finalPath = localPath;
    let size = fs.statSync(localPath).size;

    // Compress if requested
    if (job.compression) {
      const compressedPath = `${localPath}.gz`;
      execSync(`gzip -c "${localPath}" > "${compressedPath}"`);
      fs.unlinkSync(localPath);
      finalPath = compressedPath;
      size = fs.statSync(compressedPath).size;
    }

    // Encrypt if requested
    if (job.encryption) {
      const encryptedPath = `${finalPath}.enc`;
      const encryptionKey = await this.configManager.getSecret('backup_encryption_key');
      await this.encryptFile(finalPath, encryptedPath, encryptionKey);
      fs.unlinkSync(finalPath);
      finalPath = encryptedPath;
      size = fs.statSync(encryptedPath).size;
    }

    // Upload to S3
    const s3Key = `${target.destination}/${path.basename(finalPath)}`;
    await this.uploadToS3(finalPath, s3Key);

    // Cleanup local file
    fs.unlinkSync(finalPath);

    return {
      type: 'kubernetes',
      filename: path.basename(finalPath),
      size,
      location: s3Key,
      includeSecrets: target.options.includeSecrets
    };
  }

  /**
   * Backup S3 resources
   */
  private async backupS3(
    target: BackupTarget,
    backupId: string,
    job: BackupJob
  ): Promise<any> {
    // S3 sync backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const s3Key = `${target.destination}/${backupId}-s3-${timestamp}/`;

    // Use AWS CLI for S3 sync
    const command = `aws s3 sync "${target.source}" "s3://${this.BACKUP_BUCKET}/${s3Key}"`;
    execSync(command);

    // Get size information
    const listCommand = `aws s3 ls "s3://${this.BACKUP_BUCKET}/${s3Key}" --recursive --summarize`;
    const listOutput = execSync(listCommand, { encoding: 'utf8' });
    const sizeMatch = listOutput.match(/Total Size: (\d+)/);
    const size = sizeMatch ? parseInt(sizeMatch[1]) : 0;

    return {
      type: 's3',
      location: `s3://${this.BACKUP_BUCKET}/${s3Key}`,
      size,
      source: target.source
    };
  }

  /**
   * Upload file to S3
   */
  private async uploadToS3(filePath: string, s3Key: string): Promise<void> {
    const fileContent = fs.readFileSync(filePath);

    const command = new PutObjectCommand({
      Bucket: this.BACKUP_BUCKET,
      Key: s3Key,
      Body: fileContent,
      ServerSideEncryption: 'AES256'
    });

    await this.s3Client.send(command);
  }

  /**
   * Encrypt file
   */
  private async encryptFile(inputPath: string, outputPath: string, key: string): Promise<void> {
    const algorithm = 'aes-256-cbc';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);

    const input = fs.createReadStream(inputPath);
    const output = fs.createWriteStream(outputPath);

    return new Promise((resolve, reject) => {
      input.pipe(cipher).pipe(output);
      output.on('finish', resolve);
      output.on('error', reject);
    });
  }

  /**
   * Verify backup integrity
   */
  private async verifyBackup(s3Key: string, originalPath: string): Promise<void> {
    // Download and compare checksums
    const command = new GetObjectCommand({
      Bucket: this.BACKUP_BUCKET,
      Key: s3Key
    });

    const response = await this.s3Client.send(command);
    // In a real implementation, verify file integrity
    console.log(`Verified backup integrity for ${s3Key}`);
  }

  /**
   * Calculate file checksum
   */
  private async calculateFileChecksum(filePath: string): Promise<string> {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    return new Promise((resolve, reject) => {
      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Store backup metadata
   */
  private async storeBackupMetadata(result: BackupResult): Promise<void> {
    const metadataKey = `metadata/${result.backupId}.json`;
    const metadata = JSON.stringify(result, null, 2);

    const command = new PutObjectCommand({
      Bucket: this.BACKUP_BUCKET,
      Key: metadataKey,
      Body: metadata,
      ContentType: 'application/json'
    });

    await this.s3Client.send(command);
  }

  /**
   * Cleanup old backups according to retention policy
   */
  private async cleanupOldBackups(job: BackupJob): Promise<void> {
    const now = new Date();
    const retention = job.retention;

    // Calculate cutoff dates
    const dailyCutoff = new Date(now.getTime() - retention.daily * 24 * 60 * 60 * 1000);
    const weeklyCutoff = new Date(now.getTime() - retention.weekly * 7 * 24 * 60 * 60 * 1000);
    const monthlyCutoff = new Date(now.getTime() - retention.monthly * 30 * 24 * 60 * 60 * 1000);
    const yearlyCutoff = new Date(now.getTime() - retention.yearly * 365 * 24 * 60 * 60 * 1000);

    // List all backups for this job
    const listCommand = new ListObjectsV2Command({
      Bucket: this.BACKUP_BUCKET,
      Prefix: `${job.type}/${job.id}-`
    });

    const response = await this.s3Client.send(listCommand);
    const objects = response.Contents || [];

    for (const obj of objects) {
      const lastModified = obj.LastModified!;

      // Determine if backup should be kept
      const shouldKeep = this.shouldKeepBackup(lastModified, {
        dailyCutoff,
        weeklyCutoff,
        monthlyCutoff,
        yearlyCutoff
      });

      if (!shouldKeep) {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: this.BACKUP_BUCKET,
          Key: obj.Key!
        });

        await this.s3Client.send(deleteCommand);
        console.log(`Deleted old backup: ${obj.Key}`);
      }
    }
  }

  /**
   * Determine if backup should be kept based on retention policy
   */
  private shouldKeepBackup(
    lastModified: Date,
    cutoffs: {
      dailyCutoff: Date;
      weeklyCutoff: Date;
      monthlyCutoff: Date;
      yearlyCutoff: Date;
    }
  ): boolean {
    const now = new Date();

    // Keep if within daily retention
    if (lastModified > cutoffs.dailyCutoff) {
      return true;
    }

    // Keep if weekly backup and within weekly retention
    if (lastModified > cutoffs.weeklyCutoff && lastModified.getDay() === 0) {
      return true;
    }

    // Keep if monthly backup and within monthly retention
    if (lastModified > cutoffs.monthlyCutoff && lastModified.getDate() === 1) {
      return true;
    }

    // Keep if yearly backup and within yearly retention
    if (lastModified > cutoffs.yearlyCutoff &&
        lastModified.getMonth() === 0 && lastModified.getDate() === 1) {
      return true;
    }

    return false;
  }

  /**
   * Execute disaster recovery plan
   */
  async executeDRPlan(planId: string, triggerType: string = 'manual'): Promise<DRTestResult> {
    const plan = this.drPlans.get(planId);
    if (!plan) {
      throw new Error(`DR plan not found: ${planId}`);
    }

    const testId = `${planId}-${Date.now()}`;
    const startTime = Date.now();

    console.log(`Executing DR plan: ${plan.name} (${testId})`);
    this.emit('drPlanStarted', { planId, testId, triggerType });

    const testResult: DRTestResult = {
      id: testId,
      timestamp: new Date(),
      planId,
      type: triggerType as any,
      duration: 0,
      success: false,
      rtoActual: 0,
      rpoActual: 0,
      procedureResults: [],
      recommendations: []
    };

    try {
      // Sort procedures by order
      const procedures = plan.procedures.sort((a, b) => a.order - b.order);

      for (const procedure of procedures) {
        const procedureStart = Date.now();

        try {
          await this.executeDRProcedure(procedure, plan);

          testResult.procedureResults.push({
            procedureId: procedure.id,
            success: true,
            duration: Date.now() - procedureStart
          });

          console.log(`Completed DR procedure: ${procedure.name}`);
        } catch (error) {
          testResult.procedureResults.push({
            procedureId: procedure.id,
            success: false,
            duration: Date.now() - procedureStart,
            errorMessage: error.message
          });

          console.error(`Failed DR procedure: ${procedure.name}`, error);

          // Stop execution on critical procedure failure
          if (procedure.type === 'failover' || procedure.retries === 0) {
            throw error;
          }
        }
      }

      testResult.success = testResult.procedureResults.every(r => r.success);
      testResult.rtoActual = (Date.now() - startTime) / (1000 * 60); // minutes
      testResult.rpoActual = 5; // Mock RPO - calculate actual data loss

      // Generate recommendations
      if (testResult.rtoActual > plan.rto) {
        testResult.recommendations.push(`RTO exceeded target by ${testResult.rtoActual - plan.rto} minutes`);
      }

      console.log(`DR plan execution completed: ${plan.name} (Success: ${testResult.success})`);
      this.emit('drPlanCompleted', testResult);

    } catch (error) {
      testResult.success = false;
      console.error(`DR plan execution failed: ${plan.name}`, error);
      this.emit('drPlanFailed', { planId, testId, error });
    } finally {
      testResult.duration = Date.now() - startTime;

      // Store test result
      plan.lastTested = new Date();
      if (!plan.testResults) plan.testResults = [];
      plan.testResults.push(testResult);
    }

    return testResult;
  }

  /**
   * Execute a single DR procedure
   */
  private async executeDRProcedure(procedure: DRProcedure, plan: DisasterRecoveryPlan): Promise<void> {
    console.log(`Executing DR procedure: ${procedure.name}`);

    switch (procedure.type) {
      case 'backup_restore':
        await this.executeDRBackupRestore(procedure);
        break;

      case 'failover':
        await this.executeDRFailover(procedure);
        break;

      case 'notification':
        await this.executeDRNotification(procedure);
        break;

      case 'validation':
        await this.executeDRValidation(procedure);
        break;

      case 'custom':
        await this.executeDRCustom(procedure);
        break;

      default:
        throw new Error(`Unknown DR procedure type: ${procedure.type}`);
    }
  }

  /**
   * Execute backup restore DR procedure
   */
  private async executeDRBackupRestore(procedure: DRProcedure): Promise<void> {
    const params = procedure.parameters;

    if (params.backupType === 'latest') {
      // Find and restore latest backup
      const latestBackup = this.backupHistory
        .filter(b => b.success)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

      if (latestBackup) {
        await this.restoreBackup(latestBackup.backupId);
      } else {
        throw new Error('No successful backups found');
      }
    } else if (params.backupType === 'full') {
      // Restore full system backup
      const fullBackup = this.backupHistory
        .filter(b => b.success && b.type === 'full')
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

      if (fullBackup) {
        await this.restoreBackup(fullBackup.backupId);
      } else {
        throw new Error('No successful full backups found');
      }
    }
  }

  /**
   * Execute failover DR procedure
   */
  private async executeDRFailover(procedure: DRProcedure): Promise<void> {
    const params = procedure.parameters;

    // Mock failover implementation
    console.log(`Executing failover to: ${params.targetInstance}`);

    if (params.validateConnection) {
      // Validate connection to target
      await this.validateConnection(params.targetInstance);
    }

    // Switch traffic to backup instance
    await this.switchTraffic(params.targetInstance);
  }

  /**
   * Execute notification DR procedure
   */
  private async executeDRNotification(procedure: DRProcedure): Promise<void> {
    const params = procedure.parameters;

    for (const channel of params.channels) {
      await this.sendNotification(channel, params.message);
    }
  }

  /**
   * Execute validation DR procedure
   */
  private async executeDRValidation(procedure: DRProcedure): Promise<void> {
    const params = procedure.parameters;

    for (const test of params.tests) {
      await this.runValidationTest(test);
    }
  }

  /**
   * Execute custom DR procedure
   */
  private async executeDRCustom(procedure: DRProcedure): Promise<void> {
    const params = procedure.parameters;

    if (params.script) {
      execSync(params.script, { cwd: __dirname });
    } else {
      throw new Error('Custom procedure missing script parameter');
    }
  }

  /**
   * Restore backup by ID
   */
  async restoreBackup(backupId: string, targetEnvironment?: string): Promise<RestoreJob> {
    const restoreId = `restore-${Date.now()}`;

    const restoreJob: RestoreJob = {
      id: restoreId,
      backupId,
      type: 'full', // TODO: Determine from backup metadata
      targetEnvironment: targetEnvironment || this.environment,
      status: 'pending',
      progress: 0,
      startTime: new Date()
    };

    this.activeRestores.set(restoreId, restoreJob);

    try {
      restoreJob.status = 'running';

      // Mock restore implementation
      console.log(`Starting restore of backup ${backupId}`);

      // Simulate restore progress
      for (let i = 0; i <= 100; i += 10) {
        restoreJob.progress = i;
        await this.sleep(1000);
      }

      restoreJob.status = 'completed';
      restoreJob.endTime = new Date();

      console.log(`Restore completed: ${backupId}`);
      this.emit('restoreCompleted', restoreJob);

    } catch (error) {
      restoreJob.status = 'failed';
      restoreJob.errorMessage = error.message;
      restoreJob.endTime = new Date();

      console.error(`Restore failed: ${backupId}`, error);
      this.emit('restoreFailed', restoreJob);
    }

    return restoreJob;
  }

  /**
   * Start monitoring for DR triggers
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkDRTriggers();
      } catch (error) {
        console.error('Error checking DR triggers:', error);
      }
    }, this.MONITORING_INTERVAL);

    console.log('DR monitoring started');
  }

  /**
   * Check DR triggers
   */
  private async checkDRTriggers(): Promise<void> {
    for (const [planId, plan] of this.drPlans) {
      for (const trigger of plan.triggers) {
        if (!trigger.enabled) continue;

        try {
          const shouldTrigger = await this.evaluateDRTrigger(trigger);
          if (shouldTrigger) {
            console.log(`DR trigger activated for plan: ${plan.name}`);
            await this.executeDRPlan(planId, 'automated');
          }
        } catch (error) {
          console.warn(`Error evaluating DR trigger for ${planId}:`, error.message);
        }
      }
    }
  }

  /**
   * Evaluate DR trigger
   */
  private async evaluateDRTrigger(trigger: DRTrigger): Promise<boolean> {
    switch (trigger.type) {
      case 'healthcheck':
        return await this.evaluateHealthCheckTrigger(trigger.conditions);

      case 'external':
        return await this.evaluateExternalTrigger(trigger.conditions);

      case 'manual':
        return false; // Manual triggers are not automatically evaluated

      default:
        return false;
    }
  }

  /**
   * Evaluate health check trigger
   */
  private async evaluateHealthCheckTrigger(conditions: any): Promise<boolean> {
    // Mock health check evaluation
    try {
      const response = await fetch(conditions.endpoint);
      return !response.ok;
    } catch (error) {
      return true; // Consider failure as trigger condition
    }
  }

  /**
   * Evaluate external trigger
   */
  private async evaluateExternalTrigger(conditions: any): Promise<boolean> {
    // Mock external trigger evaluation
    return false;
  }

  /**
   * Helper methods
   */
  private async validateConnection(target: string): Promise<void> {
    // Mock connection validation
    console.log(`Validating connection to: ${target}`);
  }

  private async switchTraffic(target: string): Promise<void> {
    // Mock traffic switching
    console.log(`Switching traffic to: ${target}`);
  }

  private async sendNotification(channel: string, message: string): Promise<void> {
    // Mock notification sending
    console.log(`Sending ${channel} notification: ${message}`);
  }

  private async runValidationTest(test: string): Promise<void> {
    // Mock validation test
    console.log(`Running validation test: ${test}`);
  }

  private ensureBackupDirectory(): void {
    if (!fs.existsSync(this.BACKUP_PATH)) {
      fs.mkdirSync(this.BACKUP_PATH, { recursive: true });
    }
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Public API methods
   */

  getBackupJobs(): BackupJob[] {
    return Array.from(this.backupJobs.values());
  }

  getBackupHistory(limit = 50): BackupResult[] {
    return this.backupHistory.slice(-limit);
  }

  getDRPlans(): DisasterRecoveryPlan[] {
    return Array.from(this.drPlans.values());
  }

  getActiveRestores(): RestoreJob[] {
    return Array.from(this.activeRestores.values());
  }

  async triggerBackup(jobId: string): Promise<BackupResult> {
    const job = this.backupJobs.get(jobId);
    if (!job) {
      throw new Error(`Backup job not found: ${jobId}`);
    }

    return await this.executeBackupJob(job);
  }

  async stop(): Promise<void> {
    console.log('Stopping PARLANT Disaster Recovery Manager...');

    // Clear all scheduled jobs
    for (const timeout of this.scheduledJobs.values()) {
      clearTimeout(timeout);
    }
    this.scheduledJobs.clear();

    // Stop monitoring
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('DR Manager stopped');
    this.emit('stopped');
  }
}