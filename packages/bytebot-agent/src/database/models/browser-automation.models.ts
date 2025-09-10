/**
 * Browser Automation Database Models
 *
 * Comprehensive TypeScript models for browser automation entities with local-only architecture.
 * Provides type-safe interfaces for all browser automation data structures including sessions,
 * tasks, screenshots, DOM snapshots, and data extractions with performance optimization support.
 *
 * Features:
 * - Complete type safety for browser automation entities
 * - Storage tier and compression support
 * - Performance metrics integration
 * - Data retention and lifecycle management
 * - Privacy and security compliance
 *
 * @module BrowserAutomationModels
 */

import { Prisma } from '@prisma/client';

// ===== ENUMS =====

export enum BrowserSessionStatus {
  ACTIVE = 'ACTIVE',
  IDLE = 'IDLE',
  TERMINATED = 'TERMINATED',
  ERROR = 'ERROR',
}

export enum BrowserTaskStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum BrowserTaskPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum StorageTier {
  HOT = 'hot', // Frequently accessed, uncompressed
  WARM = 'warm', // Occasionally accessed, light compression
  COLD = 'cold', // Rarely accessed, heavy compression
  ARCHIVED = 'archived', // Long-term storage, maximum compression
}

export enum CompressionType {
  NONE = 'none',
  GZIP = 'gzip',
  BROTLI = 'brotli',
  ZSTD = 'zstd',
}

export enum DataExtractionType {
  TEXT = 'text',
  TABLE = 'table',
  LINKS = 'links',
  IMAGES = 'images',
  STRUCTURED = 'structured',
  FORM_DATA = 'form_data',
  METADATA = 'metadata',
}

export enum SensitivityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// ===== CORE INTERFACES =====

export interface ViewportDimensions {
  width: number;
  height: number;
}

export interface ImageDimensions extends ViewportDimensions {
  aspectRatio: number;
}

export interface BrowserAction {
  type: string;
  target?: string;
  value?: any;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export interface SessionConfiguration {
  headless: boolean;
  screenshots: boolean;
  videoRecording: boolean;
  workingDirectory: string;
  userDataDir?: string;
  chromeExecutable?: string;
  logLevel: string;
  sessionTimeout: number;
  viewport: ViewportDimensions;
  userAgent?: string;
  [key: string]: any;
}

export interface TaskConfiguration {
  timeout: number;
  retryCount: number;
  screenshotsEnabled: boolean;
  domSnapshotsEnabled: boolean;
  performanceMonitoring: boolean;
  securityConstraints?: Record<string, any>;
  validationCriteria?: Record<string, any>;
  [key: string]: any;
}

export interface PerformanceMetric {
  id: string;
  sessionId?: string;
  taskId?: string;
  metricType: string;
  metricValue: number;
  metricUnit: string;
  measurementTime: Date;
  context?: Record<string, any>;
}

export interface AccessPattern {
  totalAccesses: number;
  lastAccessed: Date;
  averageAccessInterval: number;
  accessFrequency: 'high' | 'medium' | 'low';
}

export interface ContentAnalysis {
  similarScreenshotsCount: number;
  qualityScore: number;
  contentHash: string;
  duplicateContent: boolean;
  businessValueScore: number;
}

// ===== BROWSER SESSION MODELS =====

export interface BrowserSession {
  id: string;
  processId?: string;
  status: BrowserSessionStatus;
  headless: boolean;
  viewportWidth: number;
  viewportHeight: number;
  userAgent?: string;
  workingDirectory?: string;
  screenshotsEnabled: boolean;
  videoRecording: boolean;
  timeoutMs: number;
  createdAt: Date;
  updatedAt: Date;
  terminatedAt?: Date;
  lastActivity: Date;
  error?: string;
  metadata?: Prisma.JsonValue;

  // Performance tracking
  memoryUsageMb?: number;
  cpuUsagePercent?: number;
  networkRequestsCount: number;

  // Security and compliance
  securityContext?: Prisma.JsonValue;
  complianceFlags?: Prisma.JsonValue;

  // Relationships
  tasks: BrowserTask[];
  screenshots: BrowserScreenshot[];
  domSnapshots: BrowserDomSnapshot[];
  performanceMetrics: PerformanceMetric[];
}

export interface CreateBrowserSessionRequest {
  processId?: string;
  configuration: SessionConfiguration;
  metadata?: Record<string, any>;
}

export interface UpdateBrowserSessionRequest {
  status?: BrowserSessionStatus;
  lastActivity?: Date;
  error?: string;
  metadata?: Record<string, any>;
  memoryUsageMb?: number;
  cpuUsagePercent?: number;
}

// ===== BROWSER TASK MODELS =====

export interface BrowserTask {
  id: string;
  externalTaskId?: string;
  sessionId: string;
  type: string;
  status: BrowserTaskStatus;
  priority: BrowserTaskPriority;
  startUrl?: string;
  actions: Prisma.JsonValue; // Array of BrowserAction
  configuration: Prisma.JsonValue; // TaskConfiguration
  constraints?: Prisma.JsonValue;
  validation?: Prisma.JsonValue;
  options?: Prisma.JsonValue;
  retryOptions?: Prisma.JsonValue;
  timeoutSeconds?: number;
  tags: string[];
  customData?: Prisma.JsonValue;

  // Execution tracking
  currentStep: number;
  totalSteps: number;
  startedAt?: Date;
  completedAt?: Date;
  lastActivity: Date;
  estimatedRemainingMs?: number;

  // Results and errors
  result?: Prisma.JsonValue;
  error?: Prisma.JsonValue;

  // Performance metrics
  executionTimeMs?: number;
  memoryPeakMb?: number;
  cpuTotalMs?: number;
  networkRequestsCount: number;
  screenshotsCount: number;

  // Metadata and audit
  userId?: string;
  agentId?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;

  // Relationships
  session: BrowserSession;
  executionSteps: BrowserTaskStep[];
  screenshots: BrowserScreenshot[];
  domSnapshots: BrowserDomSnapshot[];
  formData: BrowserFormData[];
  dataExtractions: BrowserDataExtraction[];
  performanceMetrics: PerformanceMetric[];
}

export interface CreateBrowserTaskRequest {
  externalTaskId?: string;
  sessionId: string;
  type: string;
  priority?: BrowserTaskPriority;
  startUrl?: string;
  actions: BrowserAction[];
  configuration?: TaskConfiguration;
  constraints?: Record<string, any>;
  validation?: Record<string, any>;
  options?: Record<string, any>;
  timeoutSeconds?: number;
  tags?: string[];
  customData?: Record<string, any>;
  userId?: string;
  agentId?: string;
}

export interface UpdateBrowserTaskRequest {
  status?: BrowserTaskStatus;
  currentStep?: number;
  totalSteps?: number;
  result?: any;
  error?: any;
  executionTimeMs?: number;
  memoryPeakMb?: number;
  cpuTotalMs?: number;
  networkRequestsCount?: number;
  screenshotsCount?: number;
}

// ===== BROWSER TASK STEP MODELS =====

export interface BrowserTaskStep {
  id: string;
  taskId: string;
  stepNumber: number;
  action: string;
  status: BrowserTaskStatus;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  result?: string;
  error?: string;
  metadata?: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;

  // Relationships
  task: BrowserTask;
}

export interface CreateBrowserTaskStepRequest {
  taskId: string;
  stepNumber: number;
  action: string;
  metadata?: Record<string, any>;
}

export interface UpdateBrowserTaskStepRequest {
  status?: BrowserTaskStatus;
  result?: string;
  error?: string;
  durationMs?: number;
  metadata?: Record<string, any>;
}

// ===== BROWSER SCREENSHOT MODELS =====

export interface BrowserScreenshot {
  id: string;
  sessionId: string;
  taskId?: string;
  filename: string;
  filePath: string;
  url?: string;
  viewport: Prisma.JsonValue; // ViewportDimensions
  timestamp: Date;
  fileSize: number;
  mimeType: string;
  compressionType: CompressionType;
  compressedSize?: number;
  checksum?: string;
  metadata?: Prisma.JsonValue;

  // Image analysis
  dimensions?: Prisma.JsonValue; // ImageDimensions
  colorProfile?: string;
  qualityScore?: number;

  // Storage optimization
  storageTier: StorageTier;
  archivedAt?: Date;
  accessCount: number;
  lastAccessed: Date;

  // Relationships
  session: BrowserSession;
  task?: BrowserTask;
}

export interface CreateBrowserScreenshotRequest {
  sessionId: string;
  taskId?: string;
  filename: string;
  filePath: string;
  url?: string;
  viewport: ViewportDimensions;
  fileSize: number;
  mimeType?: string;
  metadata?: Record<string, any>;
  dimensions?: ImageDimensions;
  qualityScore?: number;
}

export interface UpdateBrowserScreenshotRequest {
  compressionType?: CompressionType;
  compressedSize?: number;
  checksum?: string;
  storageTier?: StorageTier;
  archivedAt?: Date;
  metadata?: Record<string, any>;
}

// ===== BROWSER DOM SNAPSHOT MODELS =====

export interface BrowserDomSnapshot {
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
  accessibilityTree?: Prisma.JsonValue;
  interactiveElements?: Prisma.JsonValue;
  extractedText?: string;
  textContentHash?: string;
  metadata?: Prisma.JsonValue;
  timestamp: Date;

  // Content analysis
  elementCount?: number;
  formCount?: number;
  linkCount?: number;
  imageCount?: number;
  scriptCount?: number;

  // Performance metrics
  pageLoadTimeMs?: number;
  renderTimeMs?: number;

  // Storage optimization
  storageTier: StorageTier;
  archivedAt?: Date;
  accessCount: number;
  lastAccessed: Date;
  fileSize?: number;

  // Relationships
  session: BrowserSession;
  task?: BrowserTask;
}

export interface CreateBrowserDomSnapshotRequest {
  sessionId: string;
  taskId?: string;
  url: string;
  title?: string;
  htmlContent?: string;
  accessibilityTree?: any;
  interactiveElements?: any;
  extractedText?: string;
  metadata?: Record<string, any>;
  elementCount?: number;
  formCount?: number;
  linkCount?: number;
  imageCount?: number;
  pageLoadTimeMs?: number;
  renderTimeMs?: number;
}

export interface UpdateBrowserDomSnapshotRequest {
  htmlCompressed?: Buffer;
  compressionType?: CompressionType;
  originalSize?: number;
  compressedSize?: number;
  textContentHash?: string;
  storageTier?: StorageTier;
  archivedAt?: Date;
}

// ===== BROWSER FORM DATA MODELS =====

export interface BrowserFormData {
  id: string;
  taskId: string;
  formSelector: string;
  fieldName: string;
  fieldType: string;
  fieldValue?: string;
  isSubmitted: boolean;
  submittedAt?: Date;
  validationResult?: Prisma.JsonValue;
  metadata?: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;

  // Relationships
  task: BrowserTask;
}

export interface CreateBrowserFormDataRequest {
  taskId: string;
  formSelector: string;
  fieldName: string;
  fieldType: string;
  fieldValue?: string;
  validationResult?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface UpdateBrowserFormDataRequest {
  fieldValue?: string;
  isSubmitted?: boolean;
  submittedAt?: Date;
  validationResult?: Record<string, any>;
  metadata?: Record<string, any>;
}

// ===== BROWSER DATA EXTRACTION MODELS =====

export interface BrowserDataExtraction {
  id: string;
  taskId: string;
  extractionType: DataExtractionType;
  selector?: string;
  extractedData: Prisma.JsonValue;
  rawContent?: string;
  processedContent?: Prisma.JsonValue;
  confidence: number;
  validationResult?: Prisma.JsonValue;
  extractionMethod?: string;
  metadata?: Prisma.JsonValue;
  extractedAt: Date;

  // Content categorization
  dataCategory?: string;
  sensitivityLevel: SensitivityLevel;

  // Quality metrics
  extractionQuality?: number;
  dataCompleteness?: number;

  // Performance tracking
  extractionTimeMs?: number;
  processingTimeMs?: number;

  // Relationships
  task: BrowserTask;
}

export interface CreateBrowserDataExtractionRequest {
  taskId: string;
  extractionType: DataExtractionType;
  selector?: string;
  extractedData: any;
  rawContent?: string;
  processedContent?: any;
  confidence?: number;
  extractionMethod?: string;
  metadata?: Record<string, any>;
  dataCategory?: string;
  sensitivityLevel?: SensitivityLevel;
  extractionQuality?: number;
  dataCompleteness?: number;
  extractionTimeMs?: number;
  processingTimeMs?: number;
}

export interface UpdateBrowserDataExtractionRequest {
  processedContent?: any;
  confidence?: number;
  validationResult?: Record<string, any>;
  extractionQuality?: number;
  dataCompleteness?: number;
  metadata?: Record<string, any>;
}

// ===== PERFORMANCE METRICS MODELS =====

export interface BrowserPerformanceMetric {
  id: string;
  sessionId?: string;
  taskId?: string;
  metricType: string;
  metricValue: number;
  metricUnit: string;
  measurementTime: Date;
  context?: Prisma.JsonValue;

  // Aggregation support
  hourBucket?: Date;
  dayBucket?: Date;
}

export interface CreatePerformanceMetricRequest {
  sessionId?: string;
  taskId?: string;
  metricType: string;
  metricValue: number;
  metricUnit: string;
  context?: Record<string, any>;
}

// ===== DATA RETENTION MODELS =====

export interface DataRetentionPolicy {
  id: string;
  entityType: string;
  retentionPeriodDays: number;
  archivePeriodDays?: number;
  cleanupEnabled: boolean;
  compressionEnabled: boolean;
  policyConditions?: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
  lastExecuted?: Date;
}

export interface CreateRetentionPolicyRequest {
  entityType: string;
  retentionPeriodDays: number;
  archivePeriodDays?: number;
  cleanupEnabled?: boolean;
  compressionEnabled?: boolean;
  policyConditions?: Record<string, any>;
}

export interface CleanupExecutionLog {
  id: string;
  policyId: string;
  executionStartedAt: Date;
  executionCompletedAt?: Date;
  recordsProcessed: number;
  recordsArchived: number;
  recordsDeleted: number;
  bytesFreed: number;
  errorsCount: number;
  errorDetails?: Prisma.JsonValue;
  executionStatus: string;
}

// ===== QUERY INTERFACES =====

export interface BrowserSessionQuery {
  status?: BrowserSessionStatus[];
  createdAfter?: Date;
  createdBefore?: Date;
  lastActivityAfter?: Date;
  lastActivityBefore?: Date;
  hasError?: boolean;
  processId?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'updatedAt' | 'lastActivity';
  orderDirection?: 'asc' | 'desc';
}

export interface BrowserTaskQuery {
  sessionId?: string;
  status?: BrowserTaskStatus[];
  priority?: BrowserTaskPriority[];
  type?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  completedAfter?: Date;
  completedBefore?: Date;
  tags?: string[];
  userId?: string;
  agentId?: string;
  hasError?: boolean;
  limit?: number;
  offset?: number;
  orderBy?:
    | 'createdAt'
    | 'updatedAt'
    | 'priority'
    | 'startedAt'
    | 'completedAt';
  orderDirection?: 'asc' | 'desc';
}

export interface BrowserScreenshotQuery {
  sessionId?: string;
  taskId?: string;
  url?: string;
  storageTier?: StorageTier[];
  compressionType?: CompressionType[];
  createdAfter?: Date;
  createdBefore?: Date;
  minFileSize?: number;
  maxFileSize?: number;
  minAccessCount?: number;
  maxAccessCount?: number;
  limit?: number;
  offset?: number;
  orderBy?: 'timestamp' | 'fileSize' | 'accessCount' | 'lastAccessed';
  orderDirection?: 'asc' | 'desc';
}

export interface BrowserDomSnapshotQuery {
  sessionId?: string;
  taskId?: string;
  url?: string;
  storageTier?: StorageTier[];
  compressionType?: CompressionType[];
  createdAfter?: Date;
  createdBefore?: Date;
  hasAccessibilityTree?: boolean;
  hasInteractiveElements?: boolean;
  minElementCount?: number;
  maxElementCount?: number;
  limit?: number;
  offset?: number;
  orderBy?: 'timestamp' | 'originalSize' | 'accessCount';
  orderDirection?: 'asc' | 'desc';
}

export interface BrowserDataExtractionQuery {
  taskId?: string;
  extractionType?: DataExtractionType[];
  dataCategory?: string[];
  sensitivityLevel?: SensitivityLevel[];
  minConfidence?: number;
  extractedAfter?: Date;
  extractedBefore?: Date;
  extractionMethod?: string[];
  minExtractionQuality?: number;
  minDataCompleteness?: number;
  limit?: number;
  offset?: number;
  orderBy?: 'extractedAt' | 'confidence' | 'extractionQuality';
  orderDirection?: 'asc' | 'desc';
}

// ===== PAGINATION AND RESPONSE INTERFACES =====

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface BrowserAutomationStats {
  totalSessions: number;
  activeSessions: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  totalScreenshots: number;
  totalDomSnapshots: number;
  totalDataExtractions: number;
  totalStorageUsed: number;
  averageTaskDuration: number;
  successRate: number;
}

// ===== VALIDATION INTERFACES =====

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DataIntegrityCheck {
  entityType: string;
  checkType: string;
  isValid: boolean;
  recordsChecked: number;
  errorsFound: number;
  details?: Record<string, any>;
  checkedAt: Date;
}

// ===== TYPE GUARDS =====

export function isBrowserSession(obj: any): obj is BrowserSession {
  if (!obj || typeof obj !== 'object' || obj === null) return false;
  const record = obj as Record<string, unknown>;
  return (
    'id' in record &&
    typeof record.id === 'string' &&
    'status' in record &&
    typeof record.status === 'string' &&
    'createdAt' in record &&
    record.createdAt instanceof Date
  );
}

export function isBrowserTask(obj: any): obj is BrowserTask {
  if (!obj || typeof obj !== 'object' || obj === null) return false;
  const record = obj as Record<string, unknown>;
  return (
    'id' in record &&
    typeof record.id === 'string' &&
    'sessionId' in record &&
    typeof record.sessionId === 'string' &&
    'type' in record &&
    typeof record.type === 'string' &&
    'status' in record &&
    typeof record.status === 'string'
  );
}

export function isBrowserScreenshot(obj: any): obj is BrowserScreenshot {
  if (!obj || typeof obj !== 'object' || obj === null) return false;
  const record = obj as Record<string, unknown>;
  return (
    'id' in record &&
    typeof record.id === 'string' &&
    'sessionId' in record &&
    typeof record.sessionId === 'string' &&
    'filename' in record &&
    typeof record.filename === 'string' &&
    'filePath' in record &&
    typeof record.filePath === 'string'
  );
}

export function isBrowserDomSnapshot(obj: any): obj is BrowserDomSnapshot {
  if (!obj || typeof obj !== 'object' || obj === null) return false;
  const record = obj as Record<string, unknown>;
  return (
    'id' in record &&
    typeof record.id === 'string' &&
    'sessionId' in record &&
    typeof record.sessionId === 'string' &&
    'url' in record &&
    typeof record.url === 'string'
  );
}

export function isBrowserDataExtraction(
  obj: any,
): obj is BrowserDataExtraction {
  if (!obj || typeof obj !== 'object' || obj === null) return false;
  const record = obj as Record<string, unknown>;
  return (
    'id' in record &&
    typeof record.id === 'string' &&
    'taskId' in record &&
    typeof record.taskId === 'string' &&
    'extractionType' in record &&
    typeof record.extractionType === 'string' &&
    'extractedData' in record &&
    record.extractedData !== undefined
  );
}

// ===== UTILITY TYPES =====

export type BrowserAutomationEntity =
  | BrowserSession
  | BrowserTask
  | BrowserTaskStep
  | BrowserScreenshot
  | BrowserDomSnapshot
  | BrowserFormData
  | BrowserDataExtraction
  | BrowserPerformanceMetric;

export type CreateBrowserAutomationRequest =
  | CreateBrowserSessionRequest
  | CreateBrowserTaskRequest
  | CreateBrowserTaskStepRequest
  | CreateBrowserScreenshotRequest
  | CreateBrowserDomSnapshotRequest
  | CreateBrowserFormDataRequest
  | CreateBrowserDataExtractionRequest
  | CreatePerformanceMetricRequest;

export type UpdateBrowserAutomationRequest =
  | UpdateBrowserSessionRequest
  | UpdateBrowserTaskRequest
  | UpdateBrowserTaskStepRequest
  | UpdateBrowserScreenshotRequest
  | UpdateBrowserDomSnapshotRequest
  | UpdateBrowserFormDataRequest
  | UpdateBrowserDataExtractionRequest;

export type BrowserAutomationQuery =
  | BrowserSessionQuery
  | BrowserTaskQuery
  | BrowserScreenshotQuery
  | BrowserDomSnapshotQuery
  | BrowserDataExtractionQuery;
