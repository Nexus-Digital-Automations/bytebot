# Database Integration Architecture for Browser Automation Data Storage

## Executive Summary

This document outlines a comprehensive database integration architecture for browser automation data storage with local-only architecture. The solution supports both PostgreSQL and SQLite databases through a hybrid approach, providing enterprise-grade data management, optimization, and retention strategies specifically tailored for browser automation workflows.

## Current Database Architecture Analysis

### Existing Prisma Schema
The system currently implements a comprehensive database schema with the following browser automation entities:

#### Core Entities
- **BrowserSession**: Browser session lifecycle management
- **BrowserTask**: Individual automation task execution
- **BrowserTaskStep**: Granular step-by-step execution tracking
- **BrowserScreenshot**: Screenshot storage and metadata
- **BrowserDomSnapshot**: DOM state capture and analysis
- **BrowserFormData**: Form interaction tracking
- **BrowserDataExtraction**: Data extraction results

#### Hybrid Database Support
- **PostgreSQL**: Production-grade database for scalable deployments
- **SQLite**: Local-only database for development and edge deployments
- **Automatic Detection**: Provider selection based on configuration and environment

## Enhanced Database Schema Design

### 1. Browser Automation Core Tables

```sql
-- Browser Sessions with enhanced metadata
CREATE TABLE browser_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id VARCHAR(255),
  status browser_session_status DEFAULT 'ACTIVE',
  headless BOOLEAN DEFAULT true,
  viewport_width INTEGER DEFAULT 1280,
  viewport_height INTEGER DEFAULT 720,
  user_agent TEXT,
  working_directory TEXT,
  screenshots_enabled BOOLEAN DEFAULT true,
  video_recording BOOLEAN DEFAULT false,
  timeout_ms INTEGER DEFAULT 300000,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  terminated_at TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  error TEXT,
  metadata JSONB,
  
  -- Performance tracking
  memory_usage_mb INTEGER,
  cpu_usage_percent DECIMAL(5,2),
  network_requests_count INTEGER DEFAULT 0,
  
  -- Security and compliance
  security_context JSONB,
  compliance_flags JSONB,
  
  -- Indexing for performance
  INDEX idx_browser_sessions_status (status),
  INDEX idx_browser_sessions_created_at (created_at),
  INDEX idx_browser_sessions_last_activity (last_activity),
  INDEX idx_browser_sessions_metadata USING GIN (metadata)
);

-- Browser Tasks with enhanced execution tracking
CREATE TABLE browser_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_task_id VARCHAR(255),
  session_id UUID NOT NULL REFERENCES browser_sessions(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  status browser_task_status DEFAULT 'PENDING',
  priority browser_task_priority DEFAULT 'NORMAL',
  start_url TEXT,
  actions JSONB NOT NULL, -- Array of browser actions
  configuration JSONB, -- Task-specific configuration
  constraints JSONB, -- Security and validation constraints
  validation JSONB, -- Success/failure criteria
  options JSONB, -- Execution options
  retry_options JSONB, -- Retry configuration
  timeout_seconds INTEGER DEFAULT 300,
  tags TEXT[] DEFAULT '{}',
  custom_data JSONB,
  
  -- Execution tracking
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 1,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  estimated_remaining_ms INTEGER,
  
  -- Results and errors
  result JSONB,
  error JSONB,
  
  -- Performance metrics
  execution_time_ms INTEGER,
  memory_peak_mb INTEGER,
  cpu_total_ms INTEGER,
  network_requests_count INTEGER DEFAULT 0,
  screenshots_count INTEGER DEFAULT 0,
  
  -- Metadata and audit
  user_id VARCHAR(255),
  agent_id VARCHAR(255),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexing for performance
  INDEX idx_browser_tasks_session_id (session_id),
  INDEX idx_browser_tasks_status (status),
  INDEX idx_browser_tasks_type (type),
  INDEX idx_browser_tasks_priority (priority),
  INDEX idx_browser_tasks_created_at (created_at),
  INDEX idx_browser_tasks_user_id (user_id),
  INDEX idx_browser_tasks_tags USING GIN (tags),
  INDEX idx_browser_tasks_actions USING GIN (actions),
  INDEX idx_browser_tasks_result USING GIN (result)
);
```

### 2. Data Storage Optimization Tables

```sql
-- Optimized screenshot storage with compression and deduplication
CREATE TABLE browser_screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES browser_sessions(id) ON DELETE CASCADE,
  task_id UUID REFERENCES browser_tasks(id) ON DELETE SET NULL,
  filename VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  url TEXT,
  viewport JSONB NOT NULL, -- {width: number, height: number}
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(50) DEFAULT 'image/png',
  compression_type VARCHAR(20) DEFAULT 'none', -- 'none', 'gzip', 'brotli'
  compressed_size INTEGER,
  checksum VARCHAR(64), -- For deduplication
  metadata JSONB,
  
  -- Image analysis
  dimensions JSONB, -- {width, height, aspectRatio}
  color_profile VARCHAR(50),
  quality_score DECIMAL(3,2), -- 0.00 to 1.00
  
  -- Storage optimization
  storage_tier VARCHAR(20) DEFAULT 'local', -- 'local', 'archived', 'cold'
  archived_at TIMESTAMP,
  access_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexing
  INDEX idx_screenshots_session_id (session_id),
  INDEX idx_screenshots_task_id (task_id),
  INDEX idx_screenshots_timestamp (timestamp),
  INDEX idx_screenshots_checksum (checksum),
  INDEX idx_screenshots_storage_tier (storage_tier),
  INDEX idx_screenshots_file_size (file_size),
  UNIQUE INDEX idx_screenshots_checksum_unique (checksum) WHERE checksum IS NOT NULL
);

-- Enhanced DOM snapshots with intelligent compression
CREATE TABLE browser_dom_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES browser_sessions(id) ON DELETE CASCADE,
  task_id UUID REFERENCES browser_tasks(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  title VARCHAR(500),
  html_content TEXT, -- Compressed/truncated if too large
  html_compressed BYTEA, -- Compressed HTML content
  compression_type VARCHAR(20) DEFAULT 'gzip',
  original_size INTEGER,
  compressed_size INTEGER,
  accessibility_tree JSONB,
  interactive_elements JSONB, -- Clickable elements, form fields
  extracted_text TEXT,
  text_content_hash VARCHAR(64), -- For similarity detection
  metadata JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Content analysis
  element_count INTEGER,
  form_count INTEGER,
  link_count INTEGER,
  image_count INTEGER,
  script_count INTEGER,
  
  -- Performance metrics
  page_load_time_ms INTEGER,
  render_time_ms INTEGER,
  
  -- Storage optimization
  storage_tier VARCHAR(20) DEFAULT 'local',
  archived_at TIMESTAMP,
  access_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexing
  INDEX idx_dom_snapshots_session_id (session_id),
  INDEX idx_dom_snapshots_task_id (task_id),
  INDEX idx_dom_snapshots_url (url),
  INDEX idx_dom_snapshots_timestamp (timestamp),
  INDEX idx_dom_snapshots_text_hash (text_content_hash),
  INDEX idx_dom_snapshots_storage_tier (storage_tier),
  INDEX idx_dom_snapshots_accessibility USING GIN (accessibility_tree),
  INDEX idx_dom_snapshots_interactive USING GIN (interactive_elements)
);
```

### 3. Advanced Data Management Tables

```sql
-- Data extraction results with intelligent categorization
CREATE TABLE browser_data_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES browser_tasks(id) ON DELETE CASCADE,
  extraction_type VARCHAR(50) NOT NULL, -- 'text', 'table', 'links', 'images', 'structured', 'form_data'
  selector VARCHAR(500),
  extracted_data JSONB NOT NULL,
  raw_content TEXT,
  processed_content JSONB,
  confidence DECIMAL(3,2) DEFAULT 1.0,
  validation_result JSONB,
  extraction_method VARCHAR(50), -- 'xpath', 'css', 'ai', 'ocr', 'manual'
  metadata JSONB,
  extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Content categorization
  data_category VARCHAR(100), -- 'personal', 'financial', 'business', 'system'
  sensitivity_level VARCHAR(20) DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
  
  -- Quality metrics
  extraction_quality DECIMAL(3,2), -- Quality score
  data_completeness DECIMAL(3,2), -- Completeness percentage
  
  -- Performance tracking
  extraction_time_ms INTEGER,
  processing_time_ms INTEGER,
  
  -- Indexing
  INDEX idx_data_extractions_task_id (task_id),
  INDEX idx_data_extractions_type (extraction_type),
  INDEX idx_data_extractions_extracted_at (extracted_at),
  INDEX idx_data_extractions_confidence (confidence),
  INDEX idx_data_extractions_category (data_category),
  INDEX idx_data_extractions_sensitivity (sensitivity_level),
  INDEX idx_data_extractions_extracted_data USING GIN (extracted_data),
  INDEX idx_data_extractions_processed_content USING GIN (processed_content)
);

-- Performance monitoring and analytics
CREATE TABLE browser_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES browser_sessions(id) ON DELETE CASCADE,
  task_id UUID REFERENCES browser_tasks(id) ON DELETE CASCADE,
  metric_type VARCHAR(50) NOT NULL, -- 'cpu', 'memory', 'network', 'storage', 'response_time'
  metric_value DECIMAL(10,4) NOT NULL,
  metric_unit VARCHAR(20) NOT NULL, -- 'ms', 'mb', 'percent', 'count', 'bytes'
  measurement_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  context JSONB, -- Additional context for the metric
  
  -- Aggregation support
  hour_bucket TIMESTAMP, -- For hourly aggregation
  day_bucket DATE, -- For daily aggregation
  
  -- Indexing
  INDEX idx_performance_metrics_session_id (session_id),
  INDEX idx_performance_metrics_task_id (task_id),
  INDEX idx_performance_metrics_type (metric_type),
  INDEX idx_performance_metrics_time (measurement_time),
  INDEX idx_performance_metrics_hour_bucket (hour_bucket),
  INDEX idx_performance_metrics_day_bucket (day_bucket)
);
```

### 4. Data Retention and Cleanup Tables

```sql
-- Data lifecycle management
CREATE TABLE data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(100) NOT NULL, -- 'browser_sessions', 'screenshots', 'dom_snapshots'
  retention_period_days INTEGER NOT NULL,
  archive_period_days INTEGER,
  cleanup_enabled BOOLEAN DEFAULT true,
  compression_enabled BOOLEAN DEFAULT true,
  policy_conditions JSONB, -- Conditions for applying policy
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_executed TIMESTAMP,
  
  UNIQUE INDEX idx_retention_policies_entity_type (entity_type)
);

-- Cleanup execution tracking
CREATE TABLE cleanup_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES data_retention_policies(id) ON DELETE CASCADE,
  execution_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  execution_completed_at TIMESTAMP,
  records_processed INTEGER DEFAULT 0,
  records_archived INTEGER DEFAULT 0,
  records_deleted INTEGER DEFAULT 0,
  bytes_freed BIGINT DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  error_details JSONB,
  execution_status VARCHAR(20) DEFAULT 'running', -- 'running', 'completed', 'failed', 'cancelled'
  
  INDEX idx_cleanup_log_policy_id (policy_id),
  INDEX idx_cleanup_log_started_at (execution_started_at),
  INDEX idx_cleanup_log_status (execution_status)
);
```

## Entity Models and Relationships

### 1. Core Entity Relationships

```typescript
interface BrowserSession {
  id: string;
  processId?: string;
  status: BrowserSessionStatus;
  configuration: SessionConfiguration;
  createdAt: Date;
  updatedAt: Date;
  lastActivity: Date;
  
  // Relationships
  tasks: BrowserTask[];
  screenshots: BrowserScreenshot[];
  domSnapshots: BrowserDomSnapshot[];
  performanceMetrics: PerformanceMetric[];
}

interface BrowserTask {
  id: string;
  sessionId: string;
  type: string;
  status: BrowserTaskStatus;
  priority: BrowserTaskPriority;
  actions: BrowserAction[];
  configuration: TaskConfiguration;
  
  // Execution tracking
  currentStep: number;
  totalSteps: number;
  startedAt?: Date;
  completedAt?: Date;
  
  // Results
  result?: any;
  error?: any;
  
  // Relationships
  session: BrowserSession;
  steps: BrowserTaskStep[];
  screenshots: BrowserScreenshot[];
  domSnapshots: BrowserDomSnapshot[];
  formData: BrowserFormData[];
  dataExtractions: BrowserDataExtraction[];
  performanceMetrics: PerformanceMetric[];
}
```

### 2. Data Storage Models

```typescript
interface BrowserScreenshot {
  id: string;
  sessionId: string;
  taskId?: string;
  filename: string;
  filePath: string;
  url?: string;
  viewport: ViewportDimensions;
  timestamp: Date;
  fileSize: number;
  mimeType: string;
  compressionType: CompressionType;
  compressedSize?: number;
  checksum?: string;
  metadata?: any;
  
  // Image analysis
  dimensions: ImageDimensions;
  colorProfile?: string;
  qualityScore?: number;
  
  // Storage optimization
  storageTier: StorageTier;
  archivedAt?: Date;
  accessCount: number;
  lastAccessed: Date;
}

interface BrowserDomSnapshot {
  id: string;
  sessionId: string;
  taskId?: string;
  url: string;
  title?: string;
  htmlContent?: string;
  htmlCompressed?: Buffer;
  compressionType: CompressionType;
  originalSize?: number;
  compressedSize?: number;
  accessibilityTree?: any;
  interactiveElements?: any;
  extractedText?: string;
  textContentHash?: string;
  metadata?: any;
  timestamp: Date;
  
  // Content analysis
  elementCount?: number;
  formCount?: number;
  linkCount?: number;
  imageCount?: number;
  
  // Storage optimization
  storageTier: StorageTier;
  archivedAt?: Date;
  accessCount: number;
  lastAccessed: Date;
}
```

## Local Database Storage Optimization

### 1. SQLite Optimization Strategies

```typescript
interface SQLiteOptimizationConfig {
  // WAL mode for concurrent access
  journalMode: 'WAL';
  
  // Performance settings
  cacheSize: number; // -64000 (64MB cache)
  mmapSize: number; // 268435456 (256MB memory mapping)
  synchronous: 'NORMAL'; // Balance between safety and speed
  tempStore: 'MEMORY'; // Use memory for temporary tables
  
  // Connection pooling
  maxConnections: number;
  connectionTimeout: number;
  
  // Compression
  enableCompression: boolean;
  compressionLevel: number;
}

class SQLiteOptimizer {
  async optimizeForBrowserAutomation(db: Database): Promise<void> {
    // Enable WAL mode for concurrent access
    await db.pragma('journal_mode = WAL');
    
    // Optimize cache and memory usage
    await db.pragma('cache_size = -64000'); // 64MB cache
    await db.pragma('mmap_size = 268435456'); // 256MB mmap
    await db.pragma('temp_store = memory');
    
    // Foreign key constraints
    await db.pragma('foreign_keys = ON');
    
    // Auto-vacuum for storage reclamation
    await db.pragma('auto_vacuum = INCREMENTAL');
    
    // Optimize for browser automation workloads
    await db.pragma('synchronous = NORMAL');
    await db.pragma('page_size = 4096');
  }
  
  async createIndexes(db: Database): Promise<void> {
    // High-performance indexes for browser automation queries
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_tasks_status_priority ON browser_tasks(status, priority)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON browser_sessions(last_activity)',
      'CREATE INDEX IF NOT EXISTS idx_screenshots_session_task ON browser_screenshots(session_id, task_id)',
      'CREATE INDEX IF NOT EXISTS idx_dom_snapshots_url_timestamp ON browser_dom_snapshots(url, timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_performance_metrics_composite ON browser_performance_metrics(session_id, task_id, metric_type)',
    ];
    
    for (const indexSql of indexes) {
      await db.exec(indexSql);
    }
  }
}
```

### 2. Data Compression and Storage Tiers

```typescript
enum StorageTier {
  HOT = 'hot',           // Frequently accessed, uncompressed
  WARM = 'warm',         // Occasionally accessed, light compression
  COLD = 'cold',         // Rarely accessed, heavy compression
  ARCHIVED = 'archived'  // Long-term storage, maximum compression
}

enum CompressionType {
  NONE = 'none',
  GZIP = 'gzip',
  BROTLI = 'brotli',
  ZSTD = 'zstd'
}

class DataCompressionService {
  async compressScreenshot(
    screenshot: BrowserScreenshot,
    targetTier: StorageTier
  ): Promise<BrowserScreenshot> {
    const compressionConfig = this.getCompressionConfig(targetTier);
    
    if (compressionConfig.type === CompressionType.NONE) {
      return screenshot;
    }
    
    const compressed = await this.compress(
      screenshot.filePath,
      compressionConfig.type,
      compressionConfig.level
    );
    
    return {
      ...screenshot,
      compressionType: compressionConfig.type,
      compressedSize: compressed.size,
      storageTier: targetTier,
      filePath: compressed.path
    };
  }
  
  async compressDomSnapshot(
    snapshot: BrowserDomSnapshot,
    targetTier: StorageTier
  ): Promise<BrowserDomSnapshot> {
    const compressionConfig = this.getCompressionConfig(targetTier);
    
    if (!snapshot.htmlContent || compressionConfig.type === CompressionType.NONE) {
      return snapshot;
    }
    
    const compressed = await this.compressText(
      snapshot.htmlContent,
      compressionConfig.type
    );
    
    return {
      ...snapshot,
      htmlCompressed: compressed.data,
      compressionType: compressionConfig.type,
      originalSize: snapshot.htmlContent.length,
      compressedSize: compressed.size,
      storageTier: targetTier,
      // Clear uncompressed content to save space
      htmlContent: undefined
    };
  }
  
  private getCompressionConfig(tier: StorageTier) {
    switch (tier) {
      case StorageTier.HOT:
        return { type: CompressionType.NONE, level: 0 };
      case StorageTier.WARM:
        return { type: CompressionType.GZIP, level: 4 };
      case StorageTier.COLD:
        return { type: CompressionType.BROTLI, level: 6 };
      case StorageTier.ARCHIVED:
        return { type: CompressionType.ZSTD, level: 9 };
      default:
        return { type: CompressionType.GZIP, level: 4 };
    }
  }
}
```

## Data Retention and Cleanup Strategies

### 1. Automated Retention Policies

```typescript
interface RetentionPolicy {
  entityType: string;
  retentionPeriodDays: number;
  archivePeriodDays?: number;
  cleanupEnabled: boolean;
  compressionEnabled: boolean;
  conditions?: {
    minFileSize?: number;
    maxAccessCount?: number;
    statusFilter?: string[];
    priorityFilter?: string[];
  };
}

class DataRetentionService {
  private readonly policies: Map<string, RetentionPolicy> = new Map();
  
  constructor() {
    this.initializeDefaultPolicies();
  }
  
  private initializeDefaultPolicies(): void {
    // Browser sessions retention
    this.policies.set('browser_sessions', {
      entityType: 'browser_sessions',
      retentionPeriodDays: 90, // 3 months
      archivePeriodDays: 30,   // Archive after 1 month
      cleanupEnabled: true,
      compressionEnabled: true,
      conditions: {
        statusFilter: ['TERMINATED', 'ERROR']
      }
    });
    
    // Screenshots retention with tier-based policies
    this.policies.set('browser_screenshots', {
      entityType: 'browser_screenshots',
      retentionPeriodDays: 180, // 6 months
      archivePeriodDays: 7,     // Archive after 1 week
      cleanupEnabled: true,
      compressionEnabled: true,
      conditions: {
        maxAccessCount: 5 // Archive if accessed less than 5 times
      }
    });
    
    // DOM snapshots retention
    this.policies.set('browser_dom_snapshots', {
      entityType: 'browser_dom_snapshots',
      retentionPeriodDays: 60, // 2 months
      archivePeriodDays: 14,   // Archive after 2 weeks
      cleanupEnabled: true,
      compressionEnabled: true,
      conditions: {
        minFileSize: 1024 * 1024 // 1MB minimum for archival consideration
      }
    });
    
    // Performance metrics retention
    this.policies.set('browser_performance_metrics', {
      entityType: 'browser_performance_metrics',
      retentionPeriodDays: 30, // 1 month
      archivePeriodDays: 7,    // Archive after 1 week
      cleanupEnabled: true,
      compressionEnabled: true
    });
  }
  
  async executeCleanup(): Promise<CleanupResult> {
    const results: CleanupResult = {
      totalRecordsProcessed: 0,
      totalRecordsArchived: 0,
      totalRecordsDeleted: 0,
      totalBytesFreed: 0,
      errors: []
    };
    
    for (const [entityType, policy] of this.policies) {
      try {
        const entityResult = await this.executeEntityCleanup(policy);
        results.totalRecordsProcessed += entityResult.recordsProcessed;
        results.totalRecordsArchived += entityResult.recordsArchived;
        results.totalRecordsDeleted += entityResult.recordsDeleted;
        results.totalBytesFreed += entityResult.bytesFreed;
      } catch (error) {
        results.errors.push({
          entityType,
          error: error.message
        });
      }
    }
    
    return results;
  }
  
  private async executeEntityCleanup(policy: RetentionPolicy): Promise<EntityCleanupResult> {
    const now = new Date();
    const archiveDate = new Date(now.getTime() - (policy.archivePeriodDays * 24 * 60 * 60 * 1000));
    const deleteDate = new Date(now.getTime() - (policy.retentionPeriodDays * 24 * 60 * 60 * 1000));
    
    let recordsProcessed = 0;
    let recordsArchived = 0;
    let recordsDeleted = 0;
    let bytesFreed = 0;
    
    // Archive old records
    if (policy.archivePeriodDays && policy.compressionEnabled) {
      const recordsToArchive = await this.findRecordsToArchive(
        policy.entityType,
        archiveDate,
        policy.conditions
      );
      
      for (const record of recordsToArchive) {
        await this.archiveRecord(record);
        recordsArchived++;
        recordsProcessed++;
      }
    }
    
    // Delete expired records
    if (policy.cleanupEnabled) {
      const recordsToDelete = await this.findRecordsToDelete(
        policy.entityType,
        deleteDate,
        policy.conditions
      );
      
      for (const record of recordsToDelete) {
        const recordSize = await this.getRecordSize(record);
        await this.deleteRecord(record);
        recordsDeleted++;
        recordsProcessed++;
        bytesFreed += recordSize;
      }
    }
    
    return {
      recordsProcessed,
      recordsArchived,
      recordsDeleted,
      bytesFreed
    };
  }
}
```

### 2. Smart Archival System

```typescript
class SmartArchivalSystem {
  private readonly compressionService: DataCompressionService;
  private readonly storageService: StorageService;
  
  async analyzeDataForArchival(): Promise<ArchivalRecommendations> {
    const recommendations: ArchivalRecommendations = {
      screenshots: [],
      domSnapshots: [],
      performanceMetrics: [],
      estimatedSpaceSavings: 0
    };
    
    // Analyze screenshots for archival opportunities
    const screenshotCandidates = await this.findScreenshotArchivalCandidates();
    for (const screenshot of screenshotCandidates) {
      const recommendation = await this.analyzeScreenshotForArchival(screenshot);
      recommendations.screenshots.push(recommendation);
      recommendations.estimatedSpaceSavings += recommendation.estimatedSavings;
    }
    
    // Analyze DOM snapshots
    const domCandidates = await this.findDomSnapshotArchivalCandidates();
    for (const domSnapshot of domCandidates) {
      const recommendation = await this.analyzeDomSnapshotForArchival(domSnapshot);
      recommendations.domSnapshots.push(recommendation);
      recommendations.estimatedSpaceSavings += recommendation.estimatedSavings;
    }
    
    return recommendations;
  }
  
  private async analyzeScreenshotForArchival(
    screenshot: BrowserScreenshot
  ): Promise<ArchivalRecommendation> {
    const accessPattern = await this.getAccessPattern(screenshot.id);
    const contentAnalysis = await this.analyzeScreenshotContent(screenshot);
    
    let recommendedTier = screenshot.storageTier;
    let estimatedSavings = 0;
    
    // Determine optimal storage tier based on access patterns and content
    if (accessPattern.lastAccessed < this.getDaysAgo(30) && accessPattern.accessCount < 5) {
      recommendedTier = StorageTier.COLD;
      estimatedSavings = screenshot.fileSize * 0.7; // ~70% compression
    } else if (accessPattern.lastAccessed < this.getDaysAgo(7) && accessPattern.accessCount < 20) {
      recommendedTier = StorageTier.WARM;
      estimatedSavings = screenshot.fileSize * 0.4; // ~40% compression
    }
    
    // Additional factors for archival decision
    const factors = {
      isRedundant: contentAnalysis.similarScreenshotsCount > 3,
      isLowQuality: contentAnalysis.qualityScore < 0.5,
      isTestData: screenshot.metadata?.isTestData === true,
      hasBusinessValue: this.assessBusinessValue(screenshot)
    };
    
    return {
      id: screenshot.id,
      currentTier: screenshot.storageTier,
      recommendedTier,
      estimatedSavings,
      confidence: this.calculateRecommendationConfidence(accessPattern, contentAnalysis, factors),
      factors,
      action: this.determineAction(screenshot.storageTier, recommendedTier, factors)
    };
  }
}
```

## Database Migration Strategies

### 1. Schema Evolution Management

```typescript
interface MigrationDefinition {
  version: string;
  description: string;
  upSql: string;
  downSql: string;
  dataTransformation?: (db: Database) => Promise<void>;
  validationQueries?: string[];
}

class DatabaseMigrationManager {
  private readonly migrations: Map<string, MigrationDefinition> = new Map();
  
  constructor(private readonly database: Database) {
    this.loadMigrations();
  }
  
  private loadMigrations(): void {
    // Browser automation schema enhancements
    this.migrations.set('20250101_001_browser_automation_base', {
      version: '20250101_001',
      description: 'Create base browser automation tables',
      upSql: `
        CREATE TABLE IF NOT EXISTS browser_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          process_id VARCHAR(255),
          status VARCHAR(20) DEFAULT 'ACTIVE',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS browser_tasks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id UUID NOT NULL REFERENCES browser_sessions(id) ON DELETE CASCADE,
          type VARCHAR(100) NOT NULL,
          status VARCHAR(20) DEFAULT 'PENDING',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
      downSql: `
        DROP TABLE IF EXISTS browser_tasks;
        DROP TABLE IF EXISTS browser_sessions;
      `
    });
    
    this.migrations.set('20250101_002_add_performance_tracking', {
      version: '20250101_002',
      description: 'Add performance tracking capabilities',
      upSql: `
        ALTER TABLE browser_sessions 
        ADD COLUMN memory_usage_mb INTEGER,
        ADD COLUMN cpu_usage_percent DECIMAL(5,2),
        ADD COLUMN network_requests_count INTEGER DEFAULT 0;
        
        CREATE TABLE browser_performance_metrics (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id UUID REFERENCES browser_sessions(id) ON DELETE CASCADE,
          task_id UUID REFERENCES browser_tasks(id) ON DELETE CASCADE,
          metric_type VARCHAR(50) NOT NULL,
          metric_value DECIMAL(10,4) NOT NULL,
          metric_unit VARCHAR(20) NOT NULL,
          measurement_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_performance_metrics_session_id ON browser_performance_metrics(session_id);
        CREATE INDEX idx_performance_metrics_task_id ON browser_performance_metrics(task_id);
      `,
      downSql: `
        DROP TABLE IF EXISTS browser_performance_metrics;
        ALTER TABLE browser_sessions 
        DROP COLUMN IF EXISTS memory_usage_mb,
        DROP COLUMN IF EXISTS cpu_usage_percent,
        DROP COLUMN IF EXISTS network_requests_count;
      `
    });
    
    this.migrations.set('20250101_003_add_compression_support', {
      version: '20250101_003',
      description: 'Add compression and storage tier support',
      upSql: `
        ALTER TABLE browser_screenshots 
        ADD COLUMN compression_type VARCHAR(20) DEFAULT 'none',
        ADD COLUMN compressed_size INTEGER,
        ADD COLUMN storage_tier VARCHAR(20) DEFAULT 'hot',
        ADD COLUMN archived_at TIMESTAMP,
        ADD COLUMN access_count INTEGER DEFAULT 0,
        ADD COLUMN last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        
        ALTER TABLE browser_dom_snapshots 
        ADD COLUMN html_compressed BYTEA,
        ADD COLUMN compression_type VARCHAR(20) DEFAULT 'none',
        ADD COLUMN original_size INTEGER,
        ADD COLUMN compressed_size INTEGER,
        ADD COLUMN storage_tier VARCHAR(20) DEFAULT 'hot',
        ADD COLUMN archived_at TIMESTAMP,
        ADD COLUMN access_count INTEGER DEFAULT 0,
        ADD COLUMN last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        
        CREATE INDEX idx_screenshots_storage_tier ON browser_screenshots(storage_tier);
        CREATE INDEX idx_dom_snapshots_storage_tier ON browser_dom_snapshots(storage_tier);
      `,
      downSql: `
        ALTER TABLE browser_screenshots 
        DROP COLUMN IF EXISTS compression_type,
        DROP COLUMN IF EXISTS compressed_size,
        DROP COLUMN IF EXISTS storage_tier,
        DROP COLUMN IF EXISTS archived_at,
        DROP COLUMN IF EXISTS access_count,
        DROP COLUMN IF EXISTS last_accessed;
        
        ALTER TABLE browser_dom_snapshots 
        DROP COLUMN IF EXISTS html_compressed,
        DROP COLUMN IF EXISTS compression_type,
        DROP COLUMN IF EXISTS original_size,
        DROP COLUMN IF EXISTS compressed_size,
        DROP COLUMN IF EXISTS storage_tier,
        DROP COLUMN IF EXISTS archived_at,
        DROP COLUMN IF EXISTS access_count,
        DROP COLUMN IF EXISTS last_accessed;
      `
    });
  }
  
  async executemigrations(): Promise<MigrationResult> {
    const currentVersion = await this.getCurrentVersion();
    const pendingMigrations = this.getPendingMigrations(currentVersion);
    
    const result: MigrationResult = {
      startVersion: currentVersion,
      endVersion: currentVersion,
      migrationsExecuted: [],
      errors: []
    };
    
    for (const migration of pendingMigrations) {
      try {
        await this.executeMigration(migration);
        result.migrationsExecuted.push(migration.version);
        result.endVersion = migration.version;
      } catch (error) {
        result.errors.push({
          migration: migration.version,
          error: error.message
        });
        break; // Stop on first error
      }
    }
    
    return result;
  }
  
  private async executeMigration(migration: MigrationDefinition): Promise<void> {
    await this.database.transaction(async (tx) => {
      // Execute migration SQL
      await tx.exec(migration.upSql);
      
      // Execute data transformation if provided
      if (migration.dataTransformation) {
        await migration.dataTransformation(tx);
      }
      
      // Run validation queries
      if (migration.validationQueries) {
        for (const query of migration.validationQueries) {
          await tx.exec(query);
        }
      }
      
      // Update migration tracking table
      await tx.run(
        'INSERT INTO schema_migrations (version, description, executed_at) VALUES (?, ?, ?)',
        [migration.version, migration.description, new Date().toISOString()]
      );
    });
  }
}
```

## Data Export and Backup Patterns

### 1. Export Strategies

```typescript
interface ExportConfiguration {
  format: 'json' | 'csv' | 'sqlite' | 'sql';
  compression: boolean;
  includeMetadata: boolean;
  dateRange?: { start: Date; end: Date };
  entityFilters?: string[];
  privacy: {
    anonymize: boolean;
    excludeSensitive: boolean;
    hashPersonalData: boolean;
  };
}

class DataExportService {
  async exportBrowserAutomationData(
    config: ExportConfiguration
  ): Promise<ExportResult> {
    const exportId = this.generateExportId();
    const exportPath = this.createExportDirectory(exportId);
    
    try {
      const result: ExportResult = {
        exportId,
        exportPath,
        format: config.format,
        startedAt: new Date(),
        completedAt: null,
        totalRecords: 0,
        totalSize: 0,
        files: []
      };
      
      // Export browser sessions
      if (!config.entityFilters || config.entityFilters.includes('browser_sessions')) {
        const sessionsFile = await this.exportBrowserSessions(config, exportPath);
        result.files.push(sessionsFile);
        result.totalRecords += sessionsFile.recordCount;
        result.totalSize += sessionsFile.fileSize;
      }
      
      // Export browser tasks
      if (!config.entityFilters || config.entityFilters.includes('browser_tasks')) {
        const tasksFile = await this.exportBrowserTasks(config, exportPath);
        result.files.push(tasksFile);
        result.totalRecords += tasksFile.recordCount;
        result.totalSize += tasksFile.fileSize;
      }
      
      // Export screenshots
      if (!config.entityFilters || config.entityFilters.includes('browser_screenshots')) {
        const screenshotsFile = await this.exportScreenshots(config, exportPath);
        result.files.push(screenshotsFile);
        result.totalRecords += screenshotsFile.recordCount;
        result.totalSize += screenshotsFile.fileSize;
      }
      
      // Export DOM snapshots
      if (!config.entityFilters || config.entityFilters.includes('browser_dom_snapshots')) {
        const domFile = await this.exportDomSnapshots(config, exportPath);
        result.files.push(domFile);
        result.totalRecords += domFile.recordCount;
        result.totalSize += domFile.fileSize;
      }
      
      // Export data extractions
      if (!config.entityFilters || config.entityFilters.includes('browser_data_extractions')) {
        const extractionsFile = await this.exportDataExtractions(config, exportPath);
        result.files.push(extractionsFile);
        result.totalRecords += extractionsFile.recordCount;
        result.totalSize += extractionsFile.fileSize;
      }
      
      // Create export manifest
      const manifestFile = await this.createExportManifest(result, exportPath);
      result.files.push(manifestFile);
      
      // Compress export if requested
      if (config.compression) {
        const compressedFile = await this.compressExport(exportPath);
        result.compressedFile = compressedFile;
      }
      
      result.completedAt = new Date();
      return result;
      
    } catch (error) {
      throw new Error(`Export failed: ${error.message}`);
    }
  }
  
  private async exportBrowserSessions(
    config: ExportConfiguration,
    exportPath: string
  ): Promise<ExportFile> {
    const query = this.buildSessionsQuery(config);
    const sessions = await this.database.all(query.sql, query.params);
    
    // Apply privacy transformations
    const processedSessions = config.privacy.anonymize 
      ? this.anonymizeSessions(sessions)
      : sessions;
    
    const filename = `browser_sessions.${config.format}`;
    const filepath = path.join(exportPath, filename);
    
    let fileSize = 0;
    
    switch (config.format) {
      case 'json':
        const jsonData = JSON.stringify(processedSessions, null, 2);
        await fs.writeFile(filepath, jsonData, 'utf-8');
        fileSize = jsonData.length;
        break;
        
      case 'csv':
        const csvData = this.convertToCSV(processedSessions);
        await fs.writeFile(filepath, csvData, 'utf-8');
        fileSize = csvData.length;
        break;
        
      case 'sql':
        const sqlData = this.generateInsertStatements('browser_sessions', processedSessions);
        await fs.writeFile(filepath, sqlData, 'utf-8');
        fileSize = sqlData.length;
        break;
    }
    
    return {
      filename,
      filepath,
      recordCount: processedSessions.length,
      fileSize,
      entityType: 'browser_sessions'
    };
  }
}
```

### 2. Backup Strategies

```typescript
interface BackupConfiguration {
  backupType: 'full' | 'incremental' | 'differential';
  destination: 'local' | 'cloud' | 'network';
  encryption: boolean;
  compression: boolean;
  retention: {
    daily: number;    // Keep daily backups for X days
    weekly: number;   // Keep weekly backups for X weeks
    monthly: number;  // Keep monthly backups for X months
  };
}

class DatabaseBackupService {
  private readonly backupScheduler: BackupScheduler;
  
  constructor(private readonly database: Database) {
    this.backupScheduler = new BackupScheduler(this);
  }
  
  async createBackup(config: BackupConfiguration): Promise<BackupResult> {
    const backupId = this.generateBackupId();
    const backupTimestamp = new Date();
    
    try {
      let backupResult: BackupResult;
      
      switch (config.backupType) {
        case 'full':
          backupResult = await this.createFullBackup(backupId, config);
          break;
        case 'incremental':
          backupResult = await this.createIncrementalBackup(backupId, config);
          break;
        case 'differential':
          backupResult = await this.createDifferentialBackup(backupId, config);
          break;
        default:
          throw new Error(`Unsupported backup type: ${config.backupType}`);
      }
      
      // Apply compression if requested
      if (config.compression) {
        backupResult = await this.compressBackup(backupResult);
      }
      
      // Apply encryption if requested
      if (config.encryption) {
        backupResult = await this.encryptBackup(backupResult);
      }
      
      // Store backup metadata
      await this.storeBackupMetadata(backupResult);
      
      // Cleanup old backups according to retention policy
      await this.cleanupOldBackups(config.retention);
      
      return backupResult;
      
    } catch (error) {
      throw new Error(`Backup failed: ${error.message}`);
    }
  }
  
  private async createFullBackup(
    backupId: string,
    config: BackupConfiguration
  ): Promise<BackupResult> {
    const backupPath = this.getBackupPath(backupId, 'full');
    
    // For SQLite: Use VACUUM INTO for atomic backup
    if (this.isDatabaseSQLite()) {
      const backupFile = path.join(backupPath, 'database.sqlite');
      await this.database.exec(`VACUUM INTO '${backupFile}'`);
      
      const stats = await fs.stat(backupFile);
      
      return {
        backupId,
        type: 'full',
        path: backupPath,
        size: stats.size,
        compressed: false,
        encrypted: false,
        createdAt: new Date(),
        files: [
          {
            filename: 'database.sqlite',
            size: stats.size,
            checksum: await this.calculateChecksum(backupFile)
          }
        ]
      };
    }
    
    // For PostgreSQL: Use pg_dump equivalent
    return await this.createPostgreSQLBackup(backupId, backupPath);
  }
  
  private async createIncrementalBackup(
    backupId: string,
    config: BackupConfiguration
  ): Promise<BackupResult> {
    const lastBackup = await this.getLastBackup();
    const backupPath = this.getBackupPath(backupId, 'incremental');
    
    if (!lastBackup) {
      // No previous backup, create full backup instead
      return await this.createFullBackup(backupId, config);
    }
    
    const changedData = await this.getChangedDataSince(lastBackup.createdAt);
    const backupFiles: BackupFile[] = [];
    
    // Export changed sessions
    if (changedData.sessions.length > 0) {
      const sessionsFile = await this.exportChangedSessions(
        changedData.sessions,
        backupPath
      );
      backupFiles.push(sessionsFile);
    }
    
    // Export changed tasks
    if (changedData.tasks.length > 0) {
      const tasksFile = await this.exportChangedTasks(
        changedData.tasks,
        backupPath
      );
      backupFiles.push(tasksFile);
    }
    
    // Export new screenshots
    if (changedData.screenshots.length > 0) {
      const screenshotsFile = await this.exportChangedScreenshots(
        changedData.screenshots,
        backupPath
      );
      backupFiles.push(screenshotsFile);
    }
    
    const totalSize = backupFiles.reduce((sum, file) => sum + file.size, 0);
    
    return {
      backupId,
      type: 'incremental',
      path: backupPath,
      size: totalSize,
      compressed: false,
      encrypted: false,
      createdAt: new Date(),
      files: backupFiles,
      baseBackupId: lastBackup.backupId
    };
  }
  
  async restoreFromBackup(
    backupId: string,
    options: RestoreOptions = {}
  ): Promise<RestoreResult> {
    const backup = await this.getBackupMetadata(backupId);
    if (!backup) {
      throw new Error(`Backup ${backupId} not found`);
    }
    
    try {
      const restoreResult: RestoreResult = {
        backupId,
        startedAt: new Date(),
        completedAt: null,
        restoredTables: [],
        restoredRecords: 0,
        errors: []
      };
      
      // Decrypt backup if needed
      let backupPath = backup.path;
      if (backup.encrypted) {
        backupPath = await this.decryptBackup(backup);
      }
      
      // Decompress backup if needed
      if (backup.compressed) {
        backupPath = await this.decompressBackup(backupPath);
      }
      
      // Restore based on backup type
      switch (backup.type) {
        case 'full':
          await this.restoreFullBackup(backupPath, options, restoreResult);
          break;
        case 'incremental':
        case 'differential':
          await this.restoreIncrementalBackup(backup, options, restoreResult);
          break;
      }
      
      restoreResult.completedAt = new Date();
      return restoreResult;
      
    } catch (error) {
      throw new Error(`Restore failed: ${error.message}`);
    }
  }
}
```

## Implementation Roadmap

### Phase 1: Core Database Infrastructure (Weeks 1-2)
1. Implement hybrid database module with PostgreSQL/SQLite support
2. Create optimized database configurations for local operations
3. Implement basic browser automation entity models
4. Set up connection pooling and health monitoring

### Phase 2: Advanced Data Management (Weeks 3-4)
1. Implement data compression and storage tier system
2. Create smart archival and retention policies
3. Develop performance monitoring and metrics collection
4. Implement data validation and integrity checks

### Phase 3: Export and Backup Systems (Weeks 5-6)
1. Create comprehensive data export capabilities
2. Implement automated backup strategies with encryption
3. Develop data migration and schema evolution tools
4. Create monitoring dashboards and alerting

### Phase 4: Optimization and Monitoring (Weeks 7-8)
1. Implement advanced query optimization for browser automation workloads
2. Create predictive archival using machine learning
3. Develop comprehensive monitoring and alerting systems
4. Implement security auditing and compliance reporting

## Conclusion

This database integration architecture provides a comprehensive foundation for browser automation data storage with local-only architecture. The hybrid approach supports both PostgreSQL and SQLite databases, ensuring flexibility for different deployment scenarios while maintaining enterprise-grade performance, security, and data management capabilities.

The architecture emphasizes:
- **Local-Only Operations**: Complete data sovereignty with no external dependencies
- **Scalable Storage**: Intelligent compression and tiered storage for optimal resource utilization  
- **Data Lifecycle Management**: Automated retention, archival, and cleanup policies
- **Performance Optimization**: Database-specific optimizations for browser automation workloads
- **Enterprise Security**: Encryption, access control, and audit trails
- **Operational Excellence**: Comprehensive monitoring, backup, and disaster recovery capabilities

This foundation enables efficient storage and management of browser automation data while maintaining the flexibility to scale from development environments to production deployments.