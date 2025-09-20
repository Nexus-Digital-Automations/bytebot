/**
 * PARLANT Database Function Wrapping System - Database Migration Manager
 * Automated database schema management and migration system for 1,520+ function deployments
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { ParlantConfigManager } from '../config-management/config-manager';

export interface MigrationMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  environment: string;
  executedAt: Date;
  executedBy: string;
  checksum: string;
  rollbackScript?: string;
  dependencies: string[];
  tags: string[];
  estimatedDuration: number; // seconds
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface MigrationResult {
  success: boolean;
  migrationId: string;
  executionTime: number;
  affectedRows: number;
  warnings: string[];
  errors: string[];
  rollbackAvailable: boolean;
}

export interface DatabaseHealthCheck {
  connectionStatus: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  activeConnections: number;
  maxConnections: number;
  diskUsage: number;
  cpuUsage: number;
  memoryUsage: number;
  replicationLag?: number;
  lastBackup?: Date;
  warnings: string[];
  errors: string[];
}

export class ParlantDatabaseMigrationManager {
  private pool: Pool;
  private configManager: ParlantConfigManager;
  private environment: string;
  private migrationsPath: string;
  private backupPath: string;

  private readonly MIGRATION_TABLE = 'parlant_migrations';
  private readonly FUNCTION_REGISTRY_TABLE = 'parlant_function_registry';
  private readonly HEALTH_CHECK_TABLE = 'parlant_health_checks';

  constructor(environment: string, migrationsPath?: string) {
    this.environment = environment;
    this.configManager = new ParlantConfigManager(environment);
    this.migrationsPath = migrationsPath || path.join(__dirname, 'migrations');
    this.backupPath = path.join(__dirname, 'backups');

    // Ensure directories exist
    this.ensureDirectoryExists(this.migrationsPath);
    this.ensureDirectoryExists(this.backupPath);
  }

  /**
   * Initialize database connection and migration infrastructure
   */
  async initialize(): Promise<void> {
    const config = await this.configManager.loadConfiguration();

    // Create database connection pool
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: await this.configManager.getSecret('database_username'),
      password: await this.configManager.getSecret('database_password'),
      max: config.database.poolSize,
      idleTimeoutMillis: config.database.timeout,
      connectionTimeoutMillis: config.database.timeout,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
    });

    // Verify database connection
    await this.verifyConnection();

    // Initialize migration infrastructure
    await this.initializeMigrationInfrastructure();

    console.log(`Database migration manager initialized for environment: ${this.environment}`);
  }

  /**
   * Verify database connection and basic functionality
   */
  private async verifyConnection(): Promise<void> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      console.log('Database connection verified successfully');
    } catch (error) {
      console.error('Database connection failed:', error);
      throw new Error(`Failed to connect to database: ${error.message}`);
    }
  }

  /**
   * Initialize migration infrastructure tables
   */
  private async initializeMigrationInfrastructure(): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Create migrations tracking table
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.MIGRATION_TABLE} (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          version VARCHAR(50) NOT NULL,
          description TEXT,
          environment VARCHAR(50) NOT NULL,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          executed_by VARCHAR(255) NOT NULL,
          checksum VARCHAR(64) NOT NULL,
          rollback_script TEXT,
          dependencies JSONB DEFAULT '[]',
          tags JSONB DEFAULT '[]',
          estimated_duration INTEGER DEFAULT 0,
          actual_duration INTEGER,
          risk_level VARCHAR(20) DEFAULT 'low',
          status VARCHAR(20) DEFAULT 'completed',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Create function registry table for tracking 1,520+ functions
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.FUNCTION_REGISTRY_TABLE} (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          function_name VARCHAR(255) NOT NULL UNIQUE,
          function_type VARCHAR(50) NOT NULL,
          package_name VARCHAR(100) NOT NULL,
          version VARCHAR(50) NOT NULL,
          schema_version VARCHAR(50) NOT NULL,
          deployment_status VARCHAR(50) DEFAULT 'pending',
          validation_status VARCHAR(50) DEFAULT 'pending',
          environment VARCHAR(50) NOT NULL,
          metadata JSONB DEFAULT '{}',
          dependencies JSONB DEFAULT '[]',
          resource_requirements JSONB DEFAULT '{}',
          performance_metrics JSONB DEFAULT '{}',
          security_classification VARCHAR(50) DEFAULT 'internal',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          deployed_at TIMESTAMP WITH TIME ZONE,
          last_validation TIMESTAMP WITH TIME ZONE
        )
      `);

      // Create health checks table
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.HEALTH_CHECK_TABLE} (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          check_type VARCHAR(50) NOT NULL,
          status VARCHAR(20) NOT NULL,
          response_time INTEGER,
          metadata JSONB DEFAULT '{}',
          warnings JSONB DEFAULT '[]',
          errors JSONB DEFAULT '[]',
          environment VARCHAR(50) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Create indexes for performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_migrations_environment
        ON ${this.MIGRATION_TABLE} (environment);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_migrations_version
        ON ${this.MIGRATION_TABLE} (version);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_functions_package_name
        ON ${this.FUNCTION_REGISTRY_TABLE} (package_name);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_functions_deployment_status
        ON ${this.FUNCTION_REGISTRY_TABLE} (deployment_status);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_health_checks_created_at
        ON ${this.HEALTH_CHECK_TABLE} (created_at);
      `);

      await client.query('COMMIT');
      console.log('Migration infrastructure initialized successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Discover and load migration files
   */
  async discoverMigrations(): Promise<MigrationMetadata[]> {
    const migrations: MigrationMetadata[] = [];

    if (!fs.existsSync(this.migrationsPath)) {
      console.warn(`Migrations directory not found: ${this.migrationsPath}`);
      return migrations;
    }

    const files = fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const filePath = path.join(this.migrationsPath, file);
      const migration = await this.parseMigrationFile(filePath);
      migrations.push(migration);
    }

    return migrations;
  }

  /**
   * Parse migration file and extract metadata
   */
  private async parseMigrationFile(filePath: string): Promise<MigrationMetadata> {
    const content = fs.readFileSync(filePath, 'utf8');
    const filename = path.basename(filePath, '.sql');

    // Extract metadata from comments at the top of the file
    const metadataMatch = content.match(/\/\*\*([\s\S]*?)\*\//);
    const metadata: Partial<MigrationMetadata> = {};

    if (metadataMatch) {
      const metadataText = metadataMatch[1];

      // Parse metadata fields
      const nameMatch = metadataText.match(/@name\s+(.+)/);
      const versionMatch = metadataText.match(/@version\s+(.+)/);
      const descriptionMatch = metadataText.match(/@description\s+([\s\S]*?)(?=@|$)/);
      const dependenciesMatch = metadataText.match(/@dependencies\s+(.+)/);
      const tagsMatch = metadataText.match(/@tags\s+(.+)/);
      const durationMatch = metadataText.match(/@estimatedDuration\s+(\d+)/);
      const riskMatch = metadataText.match(/@riskLevel\s+(low|medium|high|critical)/);

      metadata.name = nameMatch ? nameMatch[1].trim() : filename;
      metadata.version = versionMatch ? versionMatch[1].trim() : '1.0.0';
      metadata.description = descriptionMatch ? descriptionMatch[1].trim() : '';
      metadata.dependencies = dependenciesMatch
        ? dependenciesMatch[1].split(',').map(dep => dep.trim())
        : [];
      metadata.tags = tagsMatch
        ? tagsMatch[1].split(',').map(tag => tag.trim())
        : [];
      metadata.estimatedDuration = durationMatch ? parseInt(durationMatch[1]) : 60;
      metadata.riskLevel = riskMatch ? riskMatch[1] as any : 'low';
    }

    // Calculate checksum
    const checksum = crypto.createHash('sha256').update(content).digest('hex');

    return {
      id: filename,
      name: metadata.name || filename,
      version: metadata.version || '1.0.0',
      description: metadata.description || '',
      environment: this.environment,
      executedAt: new Date(),
      executedBy: process.env.USER || 'system',
      checksum,
      dependencies: metadata.dependencies || [],
      tags: metadata.tags || [],
      estimatedDuration: metadata.estimatedDuration || 60,
      riskLevel: metadata.riskLevel || 'low'
    };
  }

  /**
   * Get list of pending migrations
   */
  async getPendingMigrations(): Promise<MigrationMetadata[]> {
    const allMigrations = await this.discoverMigrations();
    const executedMigrations = await this.getExecutedMigrations();

    const executedIds = new Set(executedMigrations.map(m => m.id));
    return allMigrations.filter(migration => !executedIds.has(migration.id));
  }

  /**
   * Get list of executed migrations
   */
  async getExecutedMigrations(): Promise<MigrationMetadata[]> {
    const result = await this.pool.query(`
      SELECT * FROM ${this.MIGRATION_TABLE}
      WHERE environment = $1
      ORDER BY executed_at ASC
    `, [this.environment]);

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      version: row.version,
      description: row.description,
      environment: row.environment,
      executedAt: row.executed_at,
      executedBy: row.executed_by,
      checksum: row.checksum,
      rollbackScript: row.rollback_script,
      dependencies: row.dependencies || [],
      tags: row.tags || [],
      estimatedDuration: row.estimated_duration,
      riskLevel: row.risk_level
    }));
  }

  /**
   * Execute pending migrations with validation and rollback support
   */
  async executeMigrations(options: {
    dryRun?: boolean;
    targetVersion?: string;
    backupFirst?: boolean;
    validateOnly?: boolean;
  } = {}): Promise<MigrationResult[]> {
    const pendingMigrations = await this.getPendingMigrations();
    const results: MigrationResult[] = [];

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations found');
      return results;
    }

    // Filter migrations based on target version
    let migrationsToExecute = pendingMigrations;
    if (options.targetVersion) {
      migrationsToExecute = pendingMigrations.filter(
        migration => migration.version <= options.targetVersion!
      );
    }

    // Validate migration dependencies
    const dependencyValidation = await this.validateDependencies(migrationsToExecute);
    if (!dependencyValidation.valid) {
      throw new Error(`Migration dependency validation failed: ${dependencyValidation.errors.join(', ')}`);
    }

    // Create backup if requested
    if (options.backupFirst) {
      await this.createBackup(`pre-migration-${Date.now()}`);
    }

    // Execute migrations in order
    for (const migration of migrationsToExecute) {
      console.log(`Executing migration: ${migration.name} (${migration.id})`);

      const result = await this.executeSingleMigration(migration, {
        dryRun: options.dryRun,
        validateOnly: options.validateOnly
      });

      results.push(result);

      // Stop on first failure unless it's a dry run
      if (!result.success && !options.dryRun) {
        console.error(`Migration failed: ${migration.name}. Stopping execution.`);
        break;
      }
    }

    return results;
  }

  /**
   * Execute a single migration
   */
  private async executeSingleMigration(
    migration: MigrationMetadata,
    options: { dryRun?: boolean; validateOnly?: boolean } = {}
  ): Promise<MigrationResult> {
    const startTime = Date.now();
    const client = await this.pool.connect();

    try {
      const migrationPath = path.join(this.migrationsPath, `${migration.id}.sql`);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

      // Remove metadata comments from SQL
      const cleanSQL = migrationSQL.replace(/\/\*\*[\s\S]*?\*\//, '').trim();

      if (options.validateOnly) {
        // Validate SQL syntax only
        await client.query(`EXPLAIN ${cleanSQL.split(';')[0]}`);
        return {
          success: true,
          migrationId: migration.id,
          executionTime: Date.now() - startTime,
          affectedRows: 0,
          warnings: [],
          errors: [],
          rollbackAvailable: false
        };
      }

      if (options.dryRun) {
        console.log(`[DRY RUN] Would execute migration: ${migration.name}`);
        return {
          success: true,
          migrationId: migration.id,
          executionTime: 0,
          affectedRows: 0,
          warnings: [],
          errors: [],
          rollbackAvailable: false
        };
      }

      // Execute migration in transaction
      await client.query('BEGIN');

      const statements = cleanSQL.split(';').filter(stmt => stmt.trim());
      let totalAffectedRows = 0;

      for (const statement of statements) {
        if (statement.trim()) {
          const result = await client.query(statement);
          totalAffectedRows += result.rowCount || 0;
        }
      }

      // Record migration execution
      await client.query(`
        INSERT INTO ${this.MIGRATION_TABLE} (
          id, name, version, description, environment, executed_by,
          checksum, dependencies, tags, estimated_duration,
          actual_duration, risk_level
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        migration.id,
        migration.name,
        migration.version,
        migration.description,
        migration.environment,
        migration.executedBy,
        migration.checksum,
        JSON.stringify(migration.dependencies),
        JSON.stringify(migration.tags),
        migration.estimatedDuration,
        Date.now() - startTime,
        migration.riskLevel
      ]);

      await client.query('COMMIT');

      return {
        success: true,
        migrationId: migration.id,
        executionTime: Date.now() - startTime,
        affectedRows: totalAffectedRows,
        warnings: [],
        errors: [],
        rollbackAvailable: Boolean(migration.rollbackScript)
      };

    } catch (error) {
      await client.query('ROLLBACK');

      return {
        success: false,
        migrationId: migration.id,
        executionTime: Date.now() - startTime,
        affectedRows: 0,
        warnings: [],
        errors: [error.message],
        rollbackAvailable: false
      };
    } finally {
      client.release();
    }
  }

  /**
   * Validate migration dependencies
   */
  private async validateDependencies(migrations: MigrationMetadata[]): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    const executedMigrations = await this.getExecutedMigrations();
    const executedIds = new Set(executedMigrations.map(m => m.id));

    for (const migration of migrations) {
      for (const dependency of migration.dependencies) {
        if (!executedIds.has(dependency)) {
          errors.push(`Migration ${migration.id} depends on ${dependency} which has not been executed`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Rollback specific migration
   */
  async rollbackMigration(migrationId: string): Promise<MigrationResult> {
    const migration = await this.getMigration(migrationId);

    if (!migration) {
      throw new Error(`Migration not found: ${migrationId}`);
    }

    if (!migration.rollbackScript) {
      throw new Error(`No rollback script available for migration: ${migrationId}`);
    }

    const client = await this.pool.connect();
    const startTime = Date.now();

    try {
      await client.query('BEGIN');

      // Execute rollback script
      const statements = migration.rollbackScript.split(';').filter(stmt => stmt.trim());
      let totalAffectedRows = 0;

      for (const statement of statements) {
        if (statement.trim()) {
          const result = await client.query(statement);
          totalAffectedRows += result.rowCount || 0;
        }
      }

      // Remove migration record
      await client.query(`
        DELETE FROM ${this.MIGRATION_TABLE}
        WHERE id = $1 AND environment = $2
      `, [migrationId, this.environment]);

      await client.query('COMMIT');

      return {
        success: true,
        migrationId,
        executionTime: Date.now() - startTime,
        affectedRows: totalAffectedRows,
        warnings: [],
        errors: [],
        rollbackAvailable: false
      };

    } catch (error) {
      await client.query('ROLLBACK');

      return {
        success: false,
        migrationId,
        executionTime: Date.now() - startTime,
        affectedRows: 0,
        warnings: [],
        errors: [error.message],
        rollbackAvailable: false
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get specific migration details
   */
  private async getMigration(migrationId: string): Promise<MigrationMetadata | null> {
    const result = await this.pool.query(`
      SELECT * FROM ${this.MIGRATION_TABLE}
      WHERE id = $1 AND environment = $2
    `, [migrationId, this.environment]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      version: row.version,
      description: row.description,
      environment: row.environment,
      executedAt: row.executed_at,
      executedBy: row.executed_by,
      checksum: row.checksum,
      rollbackScript: row.rollback_script,
      dependencies: row.dependencies || [],
      tags: row.tags || [],
      estimatedDuration: row.estimated_duration,
      riskLevel: row.risk_level
    };
  }

  /**
   * Create database backup
   */
  async createBackup(backupName?: string): Promise<string> {
    const config = await this.configManager.loadConfiguration();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const finalBackupName = backupName || `backup-${this.environment}-${timestamp}`;
    const backupFile = path.join(this.backupPath, `${finalBackupName}.sql`);

    const command = `pg_dump -h ${config.database.host} -p ${config.database.port} -U ${await this.configManager.getSecret('database_username')} -d ${config.database.name} -f ${backupFile}`;

    try {
      const { execSync } = require('child_process');
      execSync(command, {
        env: {
          ...process.env,
          PGPASSWORD: await this.configManager.getSecret('database_password')
        }
      });

      console.log(`Database backup created: ${backupFile}`);
      return backupFile;
    } catch (error) {
      console.error('Failed to create database backup:', error);
      throw new Error(`Backup creation failed: ${error.message}`);
    }
  }

  /**
   * Restore database from backup
   */
  async restoreBackup(backupFile: string): Promise<void> {
    if (!fs.existsSync(backupFile)) {
      throw new Error(`Backup file not found: ${backupFile}`);
    }

    const config = await this.configManager.loadConfiguration();

    const command = `psql -h ${config.database.host} -p ${config.database.port} -U ${await this.configManager.getSecret('database_username')} -d ${config.database.name} -f ${backupFile}`;

    try {
      const { execSync } = require('child_process');
      execSync(command, {
        env: {
          ...process.env,
          PGPASSWORD: await this.configManager.getSecret('database_password')
        }
      });

      console.log(`Database restored from backup: ${backupFile}`);
    } catch (error) {
      console.error('Failed to restore database backup:', error);
      throw new Error(`Backup restoration failed: ${error.message}`);
    }
  }

  /**
   * Perform comprehensive database health check
   */
  async performHealthCheck(): Promise<DatabaseHealthCheck> {
    const startTime = Date.now();
    const health: Partial<DatabaseHealthCheck> = {
      warnings: [],
      errors: []
    };

    try {
      // Test basic connectivity
      const connectionResult = await this.pool.query('SELECT NOW()');
      health.responseTime = Date.now() - startTime;
      health.connectionStatus = 'healthy';

      // Get connection statistics
      const connectionStats = await this.pool.query(`
        SELECT
          count(*) as active_connections,
          (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections
        FROM pg_stat_activity
        WHERE state = 'active'
      `);

      health.activeConnections = parseInt(connectionStats.rows[0].active_connections);
      health.maxConnections = parseInt(connectionStats.rows[0].max_connections);

      // Check disk usage
      const diskStats = await this.pool.query(`
        SELECT
          pg_size_pretty(pg_database_size(current_database())) as database_size,
          pg_database_size(current_database()) as database_size_bytes
      `);

      // Get system metrics (if available)
      try {
        const systemStats = await this.pool.query(`
          SELECT
            (SELECT setting FROM pg_settings WHERE name = 'shared_buffers') as shared_buffers,
            (SELECT setting FROM pg_settings WHERE name = 'work_mem') as work_mem
        `);
      } catch (error) {
        health.warnings?.push('Could not retrieve system statistics');
      }

      // Check replication lag (if applicable)
      try {
        const replicationStats = await this.pool.query(`
          SELECT
            pg_is_in_recovery() as is_replica,
            CASE
              WHEN pg_is_in_recovery() THEN
                EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))
              ELSE NULL
            END as replication_lag_seconds
        `);

        if (replicationStats.rows[0].is_replica) {
          health.replicationLag = parseFloat(replicationStats.rows[0].replication_lag_seconds) || 0;

          if (health.replicationLag > 30) {
            health.warnings?.push(`High replication lag: ${health.replicationLag} seconds`);
          }
        }
      } catch (error) {
        health.warnings?.push('Could not check replication status');
      }

      // Check last backup
      try {
        const backupFiles = fs.readdirSync(this.backupPath)
          .filter(file => file.endsWith('.sql'))
          .map(file => {
            const stats = fs.statSync(path.join(this.backupPath, file));
            return {
              file,
              created: stats.birthtime
            };
          })
          .sort((a, b) => b.created.getTime() - a.created.getTime());

        if (backupFiles.length > 0) {
          health.lastBackup = backupFiles[0].created;

          const hoursSinceBackup = (Date.now() - health.lastBackup.getTime()) / (1000 * 60 * 60);
          if (hoursSinceBackup > 24) {
            health.warnings?.push(`Last backup is ${Math.round(hoursSinceBackup)} hours old`);
          }
        } else {
          health.warnings?.push('No backups found');
        }
      } catch (error) {
        health.warnings?.push('Could not check backup status');
      }

      // Determine overall health status
      if (health.warnings?.length === 0 && health.errors?.length === 0) {
        health.connectionStatus = 'healthy';
      } else if (health.errors?.length === 0) {
        health.connectionStatus = 'degraded';
      } else {
        health.connectionStatus = 'unhealthy';
      }

      // Store health check result
      await this.pool.query(`
        INSERT INTO ${this.HEALTH_CHECK_TABLE} (
          check_type, status, response_time, metadata, warnings, errors, environment
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        'database',
        health.connectionStatus,
        health.responseTime,
        JSON.stringify({
          activeConnections: health.activeConnections,
          maxConnections: health.maxConnections,
          replicationLag: health.replicationLag
        }),
        JSON.stringify(health.warnings),
        JSON.stringify(health.errors),
        this.environment
      ]);

    } catch (error) {
      health.connectionStatus = 'unhealthy';
      health.errors?.push(error.message);
      health.responseTime = Date.now() - startTime;
    }

    return health as DatabaseHealthCheck;
  }

  /**
   * Register function deployment in the function registry
   */
  async registerFunction(functionData: {
    functionName: string;
    functionType: string;
    packageName: string;
    version: string;
    schemaVersion: string;
    metadata?: any;
    dependencies?: string[];
    resourceRequirements?: any;
    securityClassification?: string;
  }): Promise<void> {
    await this.pool.query(`
      INSERT INTO ${this.FUNCTION_REGISTRY_TABLE} (
        function_name, function_type, package_name, version, schema_version,
        environment, metadata, dependencies, resource_requirements, security_classification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (function_name) DO UPDATE SET
        version = EXCLUDED.version,
        schema_version = EXCLUDED.schema_version,
        metadata = EXCLUDED.metadata,
        dependencies = EXCLUDED.dependencies,
        resource_requirements = EXCLUDED.resource_requirements,
        security_classification = EXCLUDED.security_classification,
        updated_at = NOW()
    `, [
      functionData.functionName,
      functionData.functionType,
      functionData.packageName,
      functionData.version,
      functionData.schemaVersion,
      this.environment,
      JSON.stringify(functionData.metadata || {}),
      JSON.stringify(functionData.dependencies || []),
      JSON.stringify(functionData.resourceRequirements || {}),
      functionData.securityClassification || 'internal'
    ]);
  }

  /**
   * Get function registry statistics
   */
  async getFunctionRegistryStats(): Promise<{
    totalFunctions: number;
    functionsByPackage: Record<string, number>;
    functionsByType: Record<string, number>;
    functionsByStatus: Record<string, number>;
  }> {
    const results = await Promise.all([
      this.pool.query(`
        SELECT COUNT(*) as total
        FROM ${this.FUNCTION_REGISTRY_TABLE}
        WHERE environment = $1
      `, [this.environment]),

      this.pool.query(`
        SELECT package_name, COUNT(*) as count
        FROM ${this.FUNCTION_REGISTRY_TABLE}
        WHERE environment = $1
        GROUP BY package_name
      `, [this.environment]),

      this.pool.query(`
        SELECT function_type, COUNT(*) as count
        FROM ${this.FUNCTION_REGISTRY_TABLE}
        WHERE environment = $1
        GROUP BY function_type
      `, [this.environment]),

      this.pool.query(`
        SELECT deployment_status, COUNT(*) as count
        FROM ${this.FUNCTION_REGISTRY_TABLE}
        WHERE environment = $1
        GROUP BY deployment_status
      `, [this.environment])
    ]);

    return {
      totalFunctions: parseInt(results[0].rows[0].total),
      functionsByPackage: results[1].rows.reduce((acc, row) => {
        acc[row.package_name] = parseInt(row.count);
        return acc;
      }, {}),
      functionsByType: results[2].rows.reduce((acc, row) => {
        acc[row.function_type] = parseInt(row.count);
        return acc;
      }, {}),
      functionsByStatus: results[3].rows.reduce((acc, row) => {
        acc[row.deployment_status] = parseInt(row.count);
        return acc;
      }, {})
    };
  }

  /**
   * Cleanup old health check records
   */
  async cleanupHealthCheckHistory(retentionDays: number = 30): Promise<number> {
    const result = await this.pool.query(`
      DELETE FROM ${this.HEALTH_CHECK_TABLE}
      WHERE environment = $1
      AND created_at < NOW() - INTERVAL '${retentionDays} days'
    `, [this.environment]);

    return result.rowCount || 0;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
    console.log('Database connection closed');
  }

  /**
   * Ensure directory exists
   */
  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}