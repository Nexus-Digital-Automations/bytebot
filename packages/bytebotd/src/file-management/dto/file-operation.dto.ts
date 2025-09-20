import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsObject, IsOptional, IsBoolean, IsArray, IsEnum, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * File operation types
 */
export enum FileOperationType {
  UPLOAD = 'upload',
  DOWNLOAD = 'download',
  DELETE = 'delete',
  MOVE = 'move',
  COPY = 'copy',
  RENAME = 'rename',
  LIST = 'list',
  READ = 'read',
  WRITE = 'write',
  APPEND = 'append',
  CREATE_DIRECTORY = 'create_directory',
  COMPRESS = 'compress',
  EXTRACT = 'extract',
  SYNC = 'sync'
}

/**
 * File upload methods
 */
export enum FileUploadMethod {
  FORM_UPLOAD = 'form_upload',
  DRAG_DROP = 'drag_drop',
  DIRECT_INPUT = 'direct_input',
  BULK_UPLOAD = 'bulk_upload',
  FTP_UPLOAD = 'ftp_upload',
  API_UPLOAD = 'api_upload'
}

/**
 * File download methods
 */
export enum FileDownloadMethod {
  DIRECT_LINK = 'direct_link',
  FORM_SUBMISSION = 'form_submission',
  AJAX_REQUEST = 'ajax_request',
  BUTTON_CLICK = 'button_click',
  RIGHT_CLICK_SAVE = 'right_click_save',
  FTP_DOWNLOAD = 'ftp_download',
  API_DOWNLOAD = 'api_download'
}

/**
 * File formats and types
 */
export enum FileFormat {
  PDF = 'pdf',
  DOC = 'doc',
  DOCX = 'docx',
  XLS = 'xls',
  XLSX = 'xlsx',
  PPT = 'ppt',
  PPTX = 'pptx',
  TXT = 'txt',
  CSV = 'csv',
  JSON = 'json',
  XML = 'xml',
  HTML = 'html',
  ZIP = 'zip',
  RAR = 'rar',
  TAR = 'tar',
  GZ = 'gz',
  JPG = 'jpg',
  JPEG = 'jpeg',
  PNG = 'png',
  GIF = 'gif',
  BMP = 'bmp',
  SVG = 'svg',
  MP3 = 'mp3',
  MP4 = 'mp4',
  AVI = 'avi',
  MOV = 'mov',
  WAV = 'wav',
  OTHER = 'other'
}

/**
 * File compression types
 */
export enum CompressionType {
  ZIP = 'zip',
  GZIP = 'gzip',
  TAR = 'tar',
  TAR_GZ = 'tar_gz',
  RAR = 'rar',
  SEVEN_ZIP = '7z'
}

/**
 * File validation configuration
 */
export class FileValidationDto {
  @ApiPropertyOptional({
    description: 'Allowed file extensions',
    example: ['.pdf', '.doc', '.docx', '.txt']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedExtensions?: string[];

  @ApiPropertyOptional({
    description: 'Allowed MIME types',
    example: ['application/pdf', 'text/plain', 'image/jpeg']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedMimeTypes?: string[];

  @ApiPropertyOptional({
    description: 'Maximum file size in bytes',
    example: 10485760
  })
  @IsOptional()
  @IsNumber()
  maxFileSize?: number;

  @ApiPropertyOptional({
    description: 'Minimum file size in bytes',
    example: 1024
  })
  @IsOptional()
  @IsNumber()
  minFileSize?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of files',
    example: 10
  })
  @IsOptional()
  @IsNumber()
  maxFiles?: number;

  @ApiPropertyOptional({
    description: 'Whether to scan for viruses',
    example: true,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  virusScan?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to validate file content',
    example: true,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  validateContent?: boolean;
}

/**
 * File upload configuration
 */
export class FileUploadConfigDto {
  @ApiProperty({
    description: 'File upload method',
    enum: FileUploadMethod,
    example: FileUploadMethod.FORM_UPLOAD
  })
  @IsEnum(FileUploadMethod)
  method: FileUploadMethod;

  @ApiPropertyOptional({
    description: 'Target upload element selector',
    example: '#fileUpload, input[type="file"], .dropzone'
  })
  @IsOptional()
  @IsString()
  targetSelector?: string;

  @ApiPropertyOptional({
    description: 'Upload form selector',
    example: '#uploadForm'
  })
  @IsOptional()
  @IsString()
  formSelector?: string;

  @ApiPropertyOptional({
    description: 'Submit button selector after upload',
    example: '#submitBtn, button[type="submit"]'
  })
  @IsOptional()
  @IsString()
  submitSelector?: string;

  @ApiPropertyOptional({
    description: 'Whether to submit form after upload',
    example: true,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  autoSubmit?: boolean;

  @ApiPropertyOptional({
    description: 'Timeout for upload completion in milliseconds',
    example: 60000,
    default: 30000
  })
  @IsOptional()
  @IsNumber()
  uploadTimeout?: number;

  @ApiPropertyOptional({
    description: 'Delay between multiple file uploads in milliseconds',
    example: 1000,
    default: 500
  })
  @IsOptional()
  @IsNumber()
  uploadDelay?: number;

  @ApiPropertyOptional({
    description: 'File validation configuration',
    type: FileValidationDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FileValidationDto)
  validation?: FileValidationDto;

  @ApiPropertyOptional({
    description: 'Progress monitoring configuration',
    example: { trackProgress: true, progressSelector: '.progress-bar' }
  })
  @IsOptional()
  @IsObject()
  progressConfig?: Record<string, any>;
}

/**
 * File download configuration
 */
export class FileDownloadConfigDto {
  @ApiProperty({
    description: 'File download method',
    enum: FileDownloadMethod,
    example: FileDownloadMethod.DIRECT_LINK
  })
  @IsEnum(FileDownloadMethod)
  method: FileDownloadMethod;

  @ApiPropertyOptional({
    description: 'Download link or button selector',
    example: 'a[href*="download"], button.download-btn'
  })
  @IsOptional()
  @IsString()
  downloadSelector?: string;

  @ApiPropertyOptional({
    description: 'Direct download URL',
    example: 'https://example.com/files/document.pdf'
  })
  @IsOptional()
  @IsString()
  downloadUrl?: string;

  @ApiPropertyOptional({
    description: 'Target download directory',
    example: '/downloads/automation'
  })
  @IsOptional()
  @IsString()
  downloadDirectory?: string;

  @ApiPropertyOptional({
    description: 'Custom filename for downloaded file',
    example: 'report_2024-01-15.pdf'
  })
  @IsOptional()
  @IsString()
  customFilename?: string;

  @ApiPropertyOptional({
    description: 'Whether to overwrite existing files',
    example: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  overwriteExisting?: boolean;

  @ApiPropertyOptional({
    description: 'Timeout for download completion in milliseconds',
    example: 120000,
    default: 60000
  })
  @IsOptional()
  @IsNumber()
  downloadTimeout?: number;

  @ApiPropertyOptional({
    description: 'Whether to verify download completion',
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  verifyDownload?: boolean;

  @ApiPropertyOptional({
    description: 'Expected file size for verification',
    example: 2048576
  })
  @IsOptional()
  @IsNumber()
  expectedFileSize?: number;
}

/**
 * File compression configuration
 */
export class FileCompressionConfigDto {
  @ApiProperty({
    description: 'Compression type',
    enum: CompressionType,
    example: CompressionType.ZIP
  })
  @IsEnum(CompressionType)
  type: CompressionType;

  @ApiPropertyOptional({
    description: 'Compression level (0-9)',
    example: 6,
    default: 6
  })
  @IsOptional()
  @IsNumber()
  level?: number;

  @ApiPropertyOptional({
    description: 'Password for encrypted archive',
    example: 'mySecretPassword'
  })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({
    description: 'Include subdirectories',
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  includeSubdirectories?: boolean;

  @ApiPropertyOptional({
    description: 'Exclude patterns (glob)',
    example: ['*.tmp', '*.log', 'node_modules/*']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludePatterns?: string[];
}

/**
 * Base file operation DTO
 */
export class FileOperationDto {
  @ApiProperty({
    description: 'Type of file operation',
    enum: FileOperationType,
    example: FileOperationType.UPLOAD
  })
  @IsEnum(FileOperationType)
  operation: FileOperationType;

  @ApiPropertyOptional({
    description: 'Source file path or selector',
    example: '/local/path/to/file.pdf'
  })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({
    description: 'Target path or selector',
    example: '/target/directory/newfile.pdf'
  })
  @IsOptional()
  @IsString()
  target?: string;

  @ApiPropertyOptional({
    description: 'File data as base64 string',
    example: 'JVBERi0xLjQKJcOkw7zDtsOgIDIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL...'
  })
  @IsOptional()
  @IsString()
  fileData?: string;

  @ApiPropertyOptional({
    description: 'Original filename',
    example: 'document.pdf'
  })
  @IsOptional()
  @IsString()
  filename?: string;

  @ApiPropertyOptional({
    description: 'File MIME type',
    example: 'application/pdf'
  })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({
    description: 'File size in bytes',
    example: 2048576
  })
  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @ApiPropertyOptional({
    description: 'File upload configuration',
    type: FileUploadConfigDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FileUploadConfigDto)
  uploadConfig?: FileUploadConfigDto;

  @ApiPropertyOptional({
    description: 'File download configuration',
    type: FileDownloadConfigDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FileDownloadConfigDto)
  downloadConfig?: FileDownloadConfigDto;

  @ApiPropertyOptional({
    description: 'File compression configuration',
    type: FileCompressionConfigDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FileCompressionConfigDto)
  compressionConfig?: FileCompressionConfigDto;

  @ApiPropertyOptional({
    description: 'Additional operation metadata',
    example: { userId: 'user123', sessionId: 'session456' }
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * Bulk file operation DTO
 */
export class BulkFileOperationDto {
  @ApiProperty({
    description: 'List of file operations to perform',
    type: [FileOperationDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileOperationDto)
  operations: FileOperationDto[];

  @ApiPropertyOptional({
    description: 'Whether to execute operations in parallel',
    example: true,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  parallel?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum concurrent operations',
    example: 3,
    default: 1
  })
  @IsOptional()
  @IsNumber()
  maxConcurrent?: number;

  @ApiPropertyOptional({
    description: 'Whether to continue on individual operation failure',
    example: true,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  continueOnError?: boolean;

  @ApiPropertyOptional({
    description: 'Global timeout for all operations in milliseconds',
    example: 300000,
    default: 600000
  })
  @IsOptional()
  @IsNumber()
  globalTimeout?: number;

  @ApiPropertyOptional({
    description: 'Progress reporting configuration',
    example: { reportInterval: 1000, includeDetails: true }
  })
  @IsOptional()
  @IsObject()
  progressConfig?: Record<string, any>;
}

/**
 * File synchronization DTO
 */
export class FileSyncDto {
  @ApiProperty({
    description: 'Source directory or file pattern',
    example: '/source/directory'
  })
  @IsString()
  source: string;

  @ApiProperty({
    description: 'Target directory',
    example: '/target/directory'
  })
  @IsString()
  target: string;

  @ApiPropertyOptional({
    description: 'Sync direction',
    enum: ['upload', 'download', 'bidirectional'],
    example: 'upload',
    default: 'upload'
  })
  @IsOptional()
  @IsString()
  direction?: 'upload' | 'download' | 'bidirectional';

  @ApiPropertyOptional({
    description: 'Whether to delete files not in source',
    example: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  deleteExtraFiles?: boolean;

  @ApiPropertyOptional({
    description: 'Include patterns (glob)',
    example: ['*.pdf', '*.doc*']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includePatterns?: string[];

  @ApiPropertyOptional({
    description: 'Exclude patterns (glob)',
    example: ['*.tmp', '*.log']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludePatterns?: string[];

  @ApiPropertyOptional({
    description: 'Whether to preserve file timestamps',
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  preserveTimestamps?: boolean;

  @ApiPropertyOptional({
    description: 'Conflict resolution strategy',
    enum: ['overwrite', 'skip', 'rename', 'prompt'],
    example: 'overwrite',
    default: 'skip'
  })
  @IsOptional()
  @IsString()
  conflictResolution?: 'overwrite' | 'skip' | 'rename' | 'prompt';
}