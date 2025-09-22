/**
 * Enterprise Document Automation System - Core Type Definitions
 * Comprehensive type system for document generation, templates, and workflows
 */

export enum DocumentFormat {
  PDF = 'pdf',
  DOCX = 'docx',
  HTML = 'html',
  XLSX = 'xlsx',
  RTF = 'rtf',
  TXT = 'txt'
}

export enum TemplateType {
  STATIC = 'static',
  DYNAMIC = 'dynamic',
  CONDITIONAL = 'conditional',
  ITERATIVE = 'iterative',
  COMPOSITE = 'composite'
}

export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  QUEUED = 'queued'
}

export enum WorkflowStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ARCHIVED = 'archived'
}

export interface DocumentMetadata {
  id: string;
  title: string;
  description?: string;
  format: DocumentFormat;
  size: number;
  pageCount?: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  version: string;
  checksum: string;
  tags: string[];
  customProperties: Record<string, any>;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description?: string;
  type: TemplateType;
  version: string;
  format: DocumentFormat;
  schema: TemplateSchema;
  content: string;
  variables: TemplateVariable[];
  conditions: ConditionalRule[];
  iterations: IterationRule[];
  metadata: TemplateMetadata;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface TemplateSchema {
  version: string;
  properties: Record<string, PropertyDefinition>;
  required: string[];
  additionalProperties: boolean;
}

export interface PropertyDefinition {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date';
  format?: string;
  description?: string;
  default?: any;
  enum?: any[];
  items?: PropertyDefinition;
  properties?: Record<string, PropertyDefinition>;
  validation?: ValidationRule[];
}

export interface ValidationRule {
  type: 'required' | 'pattern' | 'min' | 'max' | 'minLength' | 'maxLength' | 'custom';
  value?: any;
  message: string;
  customValidator?: string;
}

export interface TemplateVariable {
  name: string;
  type: string;
  description?: string;
  defaultValue?: any;
  required: boolean;
  format?: string;
  validation?: ValidationRule[];
}

export interface ConditionalRule {
  id: string;
  condition: string;
  truthyTemplate: string;
  falsyTemplate?: string;
  description?: string;
}

export interface IterationRule {
  id: string;
  sourceProperty: string;
  template: string;
  separator?: string;
  description?: string;
}

export interface TemplateMetadata {
  tags: string[];
  category: string;
  difficulty: 'simple' | 'intermediate' | 'complex';
  estimatedProcessingTime: number;
  customProperties: Record<string, any>;
}

export interface DocumentGenerationRequest {
  id: string;
  templateId: string;
  data: Record<string, any>;
  format: DocumentFormat;
  options: GenerationOptions;
  metadata: RequestMetadata;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: Date;
  requestedBy: string;
}

export interface GenerationOptions {
  outputFormat: DocumentFormat;
  compression?: boolean;
  watermark?: WatermarkOptions;
  protection?: DocumentProtection;
  customSettings: Record<string, any>;
}

export interface WatermarkOptions {
  enabled: boolean;
  text?: string;
  image?: string;
  opacity: number;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  fontSize?: number;
  color?: string;
}

export interface DocumentProtection {
  password?: string;
  permissions: {
    print: boolean;
    copy: boolean;
    edit: boolean;
    annotate: boolean;
  };
}

export interface RequestMetadata {
  correlationId?: string;
  source: string;
  userId: string;
  sessionId?: string;
  customProperties: Record<string, any>;
}

export interface DocumentGenerationResult {
  id: string;
  requestId: string;
  status: ProcessingStatus;
  document?: GeneratedDocument;
  error?: ProcessingError;
  metrics: ProcessingMetrics;
  createdAt: Date;
  completedAt?: Date;
}

export interface GeneratedDocument {
  id: string;
  metadata: DocumentMetadata;
  content: Buffer;
  outputPath?: string;
  downloadUrl?: string;
  expiresAt?: Date;
}

export interface ProcessingError {
  code: string;
  message: string;
  details?: any;
  stack?: string;
  recoverable: boolean;
}

export interface ProcessingMetrics {
  processingTimeMs: number;
  templateRenderTimeMs: number;
  formatConversionTimeMs: number;
  outputSizeBytes: number;
  memoryUsageMB: number;
  cpuUsagePercent: number;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  version: string;
  steps: WorkflowStep[];
  approvers: ApprovalConfiguration[];
  metadata: WorkflowMetadata;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'approval' | 'generation' | 'notification' | 'transformation' | 'validation';
  order: number;
  configuration: StepConfiguration;
  conditions?: string[];
  timeout?: number;
  retryPolicy?: RetryPolicy;
}

export interface ApprovalConfiguration {
  userId: string;
  role: string;
  priority: number;
  required: boolean;
  delegateToRole?: string;
}

export interface StepConfiguration {
  templateId?: string;
  approvers?: string[];
  recipients?: string[];
  transformations?: string[];
  validators?: string[];
  customSettings: Record<string, any>;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  baseDelayMs: number;
  maxDelayMs: number;
}

export interface WorkflowMetadata {
  tags: string[];
  category: string;
  estimatedDuration: number;
  customProperties: Record<string, any>;
}

export interface BatchProcessingJob {
  id: string;
  name: string;
  requests: DocumentGenerationRequest[];
  options: BatchOptions;
  status: ProcessingStatus;
  progress: BatchProgress;
  results: DocumentGenerationResult[];
  metadata: JobMetadata;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdBy: string;
}

export interface BatchOptions {
  maxConcurrency: number;
  failFast: boolean;
  retryFailedItems: boolean;
  maxRetries: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  customSettings: Record<string, any>;
}

export interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  percentComplete: number;
  estimatedTimeRemainingMs?: number;
}

export interface JobMetadata {
  correlationId?: string;
  source: string;
  tags: string[];
  customProperties: Record<string, any>;
}

export interface DocumentAssemblyOperation {
  id: string;
  type: 'merge' | 'split' | 'watermark' | 'protect' | 'compress' | 'convert';
  input: DocumentReference[];
  output: DocumentReference;
  options: AssemblyOptions;
  status: ProcessingStatus;
  result?: AssemblyResult;
  error?: ProcessingError;
  createdAt: Date;
  completedAt?: Date;
}

export interface DocumentReference {
  id: string;
  path?: string;
  content?: Buffer;
  metadata: DocumentMetadata;
}

export interface AssemblyOptions {
  mergeOrder?: number[];
  splitCriteria?: SplitCriteria;
  watermarkOptions?: WatermarkOptions;
  protectionOptions?: DocumentProtection;
  compressionLevel?: number;
  targetFormat?: DocumentFormat;
  customSettings: Record<string, any>;
}

export interface SplitCriteria {
  type: 'page' | 'section' | 'bookmark' | 'custom';
  value: any;
  preserveFormatting: boolean;
}

export interface AssemblyResult {
  operation: string;
  inputCount: number;
  outputCount: number;
  metrics: ProcessingMetrics;
  outputDocuments: DocumentReference[];
}

export interface DataSourceConfiguration {
  id: string;
  name: string;
  type: 'database' | 'api' | 'file' | 'webhook' | 'manual';
  connectionString?: string;
  authentication: AuthenticationConfiguration;
  schema: DataSourceSchema;
  mappings: DataMapping[];
  refreshPolicy: RefreshPolicy;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthenticationConfiguration {
  type: 'none' | 'basic' | 'bearer' | 'oauth2' | 'apikey' | 'certificate';
  credentials: Record<string, string>;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface DataSourceSchema {
  version: string;
  properties: Record<string, PropertyDefinition>;
  relationships: DataRelationship[];
}

export interface DataRelationship {
  sourceProperty: string;
  targetProperty: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
}

export interface DataMapping {
  sourceField: string;
  targetField: string;
  transformation?: string;
  defaultValue?: any;
  required: boolean;
}

export interface RefreshPolicy {
  type: 'manual' | 'scheduled' | 'realtime' | 'ondemand';
  schedule?: string;
  maxAge: number;
  retryPolicy: RetryPolicy;
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

export interface PerformanceMetrics {
  timestamp: Date;
  operation: string;
  duration: number;
  throughput: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
  customMetrics: Record<string, number>;
}

export interface SystemConfiguration {
  maxConcurrentJobs: number;
  maxQueueSize: number;
  defaultTimeout: number;
  maxRetries: number;
  cleanup: {
    tempFilesAfterDays: number;
    completedJobsAfterDays: number;
    auditLogsAfterDays: number;
  };
  security: {
    maxFileSizeMB: number;
    allowedFileTypes: string[];
    encryptionEnabled: boolean;
    auditEnabled: boolean;
  };
  performance: {
    cachingEnabled: boolean;
    cacheExpirationMinutes: number;
    compressionEnabled: boolean;
    batchSizeLimit: number;
  };
}