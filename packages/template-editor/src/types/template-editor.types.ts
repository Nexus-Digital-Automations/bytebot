/**
 * Template Editor Type Definitions
 * Comprehensive type system for visual template editing and version control
 */

export enum TemplateFormat {
  HANDLEBARS = 'handlebars',
  MUSTACHE = 'mustache',
  LIQUID = 'liquid',
  TWIG = 'twig',
  JINJA2 = 'jinja2'
}

export enum EditorMode {
  VISUAL = 'visual',
  CODE = 'code',
  SPLIT = 'split',
  PREVIEW = 'preview'
}

export enum VersionStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  DEPRECATED = 'deprecated'
}

export enum CollaborationPermission {
  READ = 'read',
  WRITE = 'write',
  ADMIN = 'admin',
  OWNER = 'owner'
}

export enum ChangeType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  MOVE = 'move',
  COPY = 'copy',
  MERGE = 'merge'
}

export interface TemplateVersion {
  id: string;
  templateId: string;
  version: string;
  majorVersion: number;
  minorVersion: number;
  patchVersion: number;
  status: VersionStatus;
  content: string;
  variables: TemplateVariable[];
  metadata: VersionMetadata;
  changes: ChangeRecord[];
  parentVersionId?: string;
  createdAt: Date;
  createdBy: string;
  publishedAt?: Date;
  publishedBy?: string;
  description?: string;
  commitMessage?: string;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  description?: string;
  defaultValue?: any;
  required: boolean;
  validation?: ValidationRule[];
  examples?: any[];
  category?: string;
}

export interface ValidationRule {
  type: 'required' | 'pattern' | 'min' | 'max' | 'minLength' | 'maxLength' | 'custom';
  value?: any;
  message: string;
  customValidator?: string;
}

export interface VersionMetadata {
  tags: string[];
  category: string;
  difficulty: 'simple' | 'intermediate' | 'complex';
  estimatedRenderTime: number;
  compatibility: string[];
  dependencies: string[];
  customProperties: Record<string, any>;
}

export interface ChangeRecord {
  id: string;
  type: ChangeType;
  timestamp: Date;
  userId: string;
  description: string;
  before?: any;
  after?: any;
  location?: ChangeLocation;
}

export interface ChangeLocation {
  line?: number;
  column?: number;
  offset?: number;
  length?: number;
  path?: string;
}

export interface EditorSession {
  id: string;
  templateId: string;
  versionId: string;
  userId: string;
  mode: EditorMode;
  cursor: CursorPosition;
  selection: TextSelection;
  viewport: ViewportInfo;
  isActive: boolean;
  lastActivity: Date;
  createdAt: Date;
}

export interface CursorPosition {
  line: number;
  column: number;
  offset: number;
}

export interface TextSelection {
  start: CursorPosition;
  end: CursorPosition;
  text: string;
}

export interface ViewportInfo {
  scrollTop: number;
  scrollLeft: number;
  visibleRange: {
    startLine: number;
    endLine: number;
  };
}

export interface CollaborationEvent {
  id: string;
  sessionId: string;
  type: CollaborationEventType;
  userId: string;
  timestamp: Date;
  data: any;
}

export enum CollaborationEventType {
  CURSOR_MOVE = 'cursor_move',
  SELECTION_CHANGE = 'selection_change',
  TEXT_INSERT = 'text_insert',
  TEXT_DELETE = 'text_delete',
  USER_JOIN = 'user_join',
  USER_LEAVE = 'user_leave',
  COMMENT_ADD = 'comment_add',
  COMMENT_RESOLVE = 'comment_resolve'
}

export interface TemplateComment {
  id: string;
  templateId: string;
  versionId: string;
  userId: string;
  content: string;
  location: CommentLocation;
  isResolved: boolean;
  parentCommentId?: string;
  mentions: string[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface CommentLocation {
  line: number;
  column: number;
  length: number;
  context: string;
}

export interface TemplateSnapshot {
  id: string;
  templateId: string;
  versionId: string;
  content: string;
  timestamp: Date;
  triggeredBy: 'auto' | 'manual' | 'collaboration';
  metadata: SnapshotMetadata;
}

export interface SnapshotMetadata {
  changeCount: number;
  participantCount: number;
  duration: number;
  fileSize: number;
  customProperties: Record<string, any>;
}

export interface MergeConflict {
  id: string;
  sourceVersionId: string;
  targetVersionId: string;
  location: ChangeLocation;
  sourceContent: string;
  targetContent: string;
  conflictType: 'content' | 'variable' | 'metadata';
  isResolved: boolean;
  resolution?: MergeResolution;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface MergeResolution {
  strategy: 'accept_source' | 'accept_target' | 'manual' | 'combined';
  resolvedContent: string;
  reason?: string;
}

export interface TemplatePreview {
  id: string;
  templateId: string;
  versionId: string;
  sampleData: Record<string, any>;
  renderedContent: string;
  format: string;
  generatedAt: Date;
  isValid: boolean;
  errors: PreviewError[];
  warnings: PreviewWarning[];
}

export interface PreviewError {
  code: string;
  message: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning' | 'info';
}

export interface PreviewWarning {
  code: string;
  message: string;
  line?: number;
  column?: number;
  suggestion?: string;
}

export interface TemplateLibrary {
  id: string;
  name: string;
  description?: string;
  category: string;
  isPublic: boolean;
  templates: LibraryTemplate[];
  owners: string[];
  contributors: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LibraryTemplate {
  templateId: string;
  name: string;
  description?: string;
  category: string;
  tags: string[];
  popularity: number;
  rating: number;
  downloadCount: number;
  addedAt: Date;
  updatedAt: Date;
}

export interface TemplateDiff {
  id: string;
  sourceVersionId: string;
  targetVersionId: string;
  changes: DiffChange[];
  statistics: DiffStatistics;
  generatedAt: Date;
}

export interface DiffChange {
  type: 'add' | 'remove' | 'modify';
  line: number;
  content: string;
  oldContent?: string;
  newContent?: string;
}

export interface DiffStatistics {
  linesAdded: number;
  linesRemoved: number;
  linesModified: number;
  filesChanged: number;
  variablesAdded: number;
  variablesRemoved: number;
  variablesModified: number;
}

export interface EditorConfiguration {
  theme: 'light' | 'dark' | 'auto';
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  lineNumbers: boolean;
  minimap: boolean;
  autoSave: boolean;
  autoSaveInterval: number;
  syntaxHighlighting: boolean;
  autoComplete: boolean;
  livePreview: boolean;
  collaborationEnabled: boolean;
  versionControlEnabled: boolean;
  customSettings: Record<string, any>;
}

export interface AutoSaveConfiguration {
  enabled: boolean;
  interval: number;
  maxVersions: number;
  strategy: 'interval' | 'changes' | 'hybrid';
  conditions: AutoSaveCondition[];
}

export interface AutoSaveCondition {
  type: 'idle_time' | 'change_count' | 'time_elapsed' | 'focus_lost';
  value: number;
  enabled: boolean;
}

export interface TemplateValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
  performance: ValidationPerformance;
}

export interface ValidationError {
  code: string;
  message: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning';
  category: 'syntax' | 'semantic' | 'performance' | 'security';
}

export interface ValidationWarning {
  code: string;
  message: string;
  line?: number;
  column?: number;
  suggestion?: string;
}

export interface ValidationSuggestion {
  code: string;
  message: string;
  line?: number;
  column?: number;
  replacement?: string;
  confidence: number;
}

export interface ValidationPerformance {
  complexity: number;
  estimatedRenderTime: number;
  memoryUsage: number;
  recommendations: PerformanceRecommendation[];
}

export interface PerformanceRecommendation {
  type: 'optimization' | 'refactoring' | 'caching';
  message: string;
  impact: 'low' | 'medium' | 'high';
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface TemplateExport {
  format: 'json' | 'yaml' | 'zip' | 'git';
  includeVersions: boolean;
  includeComments: boolean;
  includeHistory: boolean;
  compression: boolean;
  encryption?: EncryptionOptions;
}

export interface EncryptionOptions {
  enabled: boolean;
  algorithm: string;
  password?: string;
  keyFile?: string;
}

export interface TemplateImport {
  source: 'file' | 'url' | 'git' | 'library';
  format: 'json' | 'yaml' | 'zip' | 'auto';
  options: ImportOptions;
  validation: ImportValidation;
}

export interface ImportOptions {
  overwriteExisting: boolean;
  mergeVersions: boolean;
  preserveHistory: boolean;
  createBackup: boolean;
  customMapping: Record<string, string>;
}

export interface ImportValidation {
  validateSyntax: boolean;
  validateVariables: boolean;
  validateCompatibility: boolean;
  strictMode: boolean;
}

export interface TemplateAnalytics {
  templateId: string;
  usage: UsageStatistics;
  performance: PerformanceStatistics;
  collaboration: CollaborationStatistics;
  versions: VersionStatistics;
  errors: ErrorStatistics;
}

export interface UsageStatistics {
  totalViews: number;
  totalEdits: number;
  totalGenerations: number;
  uniqueUsers: number;
  averageSessionDuration: number;
  popularTimeRanges: TimeRange[];
}

export interface TimeRange {
  start: Date;
  end: Date;
  count: number;
}

export interface PerformanceStatistics {
  averageRenderTime: number;
  averageLoadTime: number;
  averageFileSize: number;
  performanceScore: number;
  bottlenecks: PerformanceBottleneck[];
}

export interface PerformanceBottleneck {
  location: string;
  type: string;
  impact: number;
  frequency: number;
}

export interface CollaborationStatistics {
  totalCollaborators: number;
  averageSessionsPerUser: number;
  conflictRate: number;
  mergeSuccessRate: number;
  commentActivity: CommentActivity;
}

export interface CommentActivity {
  totalComments: number;
  averageCommentsPerSession: number;
  resolutionRate: number;
  averageResolutionTime: number;
}

export interface VersionStatistics {
  totalVersions: number;
  averageVersionsPerMonth: number;
  majorVersions: number;
  minorVersions: number;
  patchVersions: number;
  branchingFactor: number;
}

export interface ErrorStatistics {
  syntaxErrors: number;
  validationErrors: number;
  renderErrors: number;
  mostCommonErrors: ErrorFrequency[];
}

export interface ErrorFrequency {
  errorCode: string;
  count: number;
  percentage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}