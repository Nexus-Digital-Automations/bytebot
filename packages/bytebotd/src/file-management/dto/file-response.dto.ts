import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';import { FileOperationType, FileFormat, FileUploadMethod, FileDownloadMethod } from './file-operation.dto';/*** File operation status
 */
export enum FileOperationStatus {
  PENDING = 'pending',IN_PROGRESS = 'in_progress',COMPLETED = 'completed',FAILED = 'failed',CANCELLED = 'cancelled',PAUSED = 'paused'}/**
 * File information
 */
export class FileInfoDto {
  @ApiProperty({
    description: 'File name',example: 'document.pdf'})name: string;

  @ApiProperty({
    description: 'File path',example: '/uploads/documents/document.pdf'})path: string;

  @ApiProperty({
    description: 'File size in bytes',example: 2048576})
  size: number;

  @ApiPropertyOptional({
    description: 'File extension',example: '.pdf'})extension?: string;

  @ApiPropertyOptional({
    description: 'MIME type',example: 'application/pdf'})mimeType?: string;

  @ApiPropertyOptional({
    description: 'File format',enum: FileFormat,example: FileFormat.PDF
  })
  format?: FileFormat;

  @ApiPropertyOptional({
    description: 'File creation timestamp',example: '2024-01-15T10:30:00.000Z'})createdAt?: string;

  @ApiPropertyOptional({
    description: 'File modification timestamp',example: '2024-01-15T10:35:00.000Z'})modifiedAt?: string;

  @ApiPropertyOptional({
    description: 'File checksum (MD5)',example: 'd41d8cd98f00b204e9800998ecf8427e'})checksum?: string;

  @ApiPropertyOptional({
    description: 'File permissions',example: '644'})permissions?: string;

  @ApiPropertyOptional({
    description: 'File owner',example: 'user'})owner?: string;

  @ApiPropertyOptional({
    description: 'Additional file metadata',example: { pages: 15, author: 'John Doe', title: 'Sample Document' }})metadata?: Record<string, any>;
}

/**
 * File operation progress
 */
export class FileOperationProgressDto {
  @ApiProperty({
    description: 'Operation progress percentage',example: 75.5})
  progressPercentage: number;

  @ApiProperty({
    description: 'Bytes transferred',example: 1536000})
  bytesTransferred: number;

  @ApiProperty({
    description: 'Total bytes',example: 2048576})
  totalBytes: number;

  @ApiProperty({
    description: 'Transfer rate in bytes per second',example: 512000})
  transferRate: number;

  @ApiPropertyOptional({
    description: 'Estimated time remaining in milliseconds',example: 15000})
  estimatedTimeRemaining?: number;

  @ApiPropertyOptional({
    description: 'Current operation phase',example: 'uploading'})currentPhase?: string;

  @ApiPropertyOptional({
    description: 'Elapsed time in milliseconds',example: 45000})
  elapsedTime?: number;
}

/**
 * File validation result
 */
export class FileValidationResultDto {
  @ApiProperty({
    description: 'Whether file passed validation',example: true})
  isValid: boolean;

  @ApiPropertyOptional({
    description: 'Validation error messages',example: ['File size exceeds maximum limit', 'File type not allowed']})errors?: string[];

  @ApiPropertyOptional({
    description: 'Validation warnings',example: ['File may contain macros', 'Large file size detected']})warnings?: string[];

  @ApiPropertyOptional({
    description: 'Virus scan result',example: { clean: true, engine: 'ClamAV', signature: 'v2024.01.15' }})virusScanResult?: any;

  @ApiPropertyOptional({
    description: 'Content validation result',example: { validFormat: true, corruptionDetected: false }})
  contentValidation?: any;
}

/**
 * File upload result
 */
export class FileUploadResultDto {
  @ApiProperty({
    description: 'Upload operation ID',example: 'upload_1704454800_abc123'})operationId: string;

  @ApiProperty({
    description: 'Upload status',enum: FileOperationStatus,example: FileOperationStatus.COMPLETED
  })
  status: FileOperationStatus;

  @ApiProperty({
    description: 'Upload method used',enum: FileUploadMethod,example: FileUploadMethod.FORM_UPLOAD
  })
  method: FileUploadMethod;

  @ApiProperty({
    description: 'Uploaded file information',type: FileInfoDto})
  fileInfo: FileInfoDto;

  @ApiProperty({
    description: 'Upload progress information',type: FileOperationProgressDto})
  progress: FileOperationProgressDto;

  @ApiPropertyOptional({
    description: 'File validation result',type: FileValidationResultDto})
  validation?: FileValidationResultDto;

  @ApiProperty({
    description: 'Upload start time',example: '2024-01-15T10:30:00.000Z'})startTime: string;

  @ApiPropertyOptional({
    description: 'Upload completion time',example: '2024-01-15T10:30:45.000Z'})endTime?: string;

  @ApiProperty({
    description: 'Upload duration in milliseconds',example: 45000})
  durationMs: number;

  @ApiPropertyOptional({
    description: 'Server response after upload',example: { success: true, fileId: 'file_12345', message: 'Upload successful' }})serverResponse?: any;

  @ApiPropertyOptional({
    description: 'Upload error message if failed',example: 'Network timeout during upload'})errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Screenshot of upload interface',example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='})screenshot?: string;

  @ApiPropertyOptional({
    description: 'Additional upload metadata',example: { targetForm: '#uploadForm', submitButton: '#submitBtn' }})metadata?: Record<string, any>;
}

/**
 * File download result
 */
export class FileDownloadResultDto {
  @ApiProperty({
    description: 'Download operation ID',example: 'download_1704454800_xyz789'})operationId: string;

  @ApiProperty({
    description: 'Download status',enum: FileOperationStatus,example: FileOperationStatus.COMPLETED
  })
  status: FileOperationStatus;

  @ApiProperty({
    description: 'Download method used',enum: FileDownloadMethod,example: FileDownloadMethod.DIRECT_LINK
  })
  method: FileDownloadMethod;

  @ApiProperty({
    description: 'Downloaded file information',type: FileInfoDto})
  fileInfo: FileInfoDto;

  @ApiProperty({
    description: 'Download progress information',type: FileOperationProgressDto})
  progress: FileOperationProgressDto;

  @ApiProperty({
    description: 'Download start time',example: '2024-01-15T10:30:00.000Z'})startTime: string;

  @ApiPropertyOptional({
    description: 'Download completion time',example: '2024-01-15T10:31:20.000Z'})endTime?: string;

  @ApiProperty({
    description: 'Download duration in milliseconds',example: 80000})
  durationMs: number;

  @ApiPropertyOptional({
    description: 'Source URL of downloaded file',example: 'https://example.com/files/document.pdf'})sourceUrl?: string;

  @ApiPropertyOptional({
    description: 'Local file path where file was saved',example: '/downloads/automation/document.pdf'})localPath?: string;

  @ApiPropertyOptional({
    description: 'Download verification result',example: { verified: true, checksumMatch: true, sizeMatch: true }})
  verification?: any;

  @ApiPropertyOptional({
    description: 'Download error message if failed',example: 'File not found at specified URL'})errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Screenshot of download interface',example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='})screenshot?: string;

  @ApiPropertyOptional({
    description: 'HTTP response headers',example: { 'content-type': 'application/pdf', 'content-length': '2048576' }})responseHeaders?: Record<string, string>;
}

/**
 * File operation response
 */
export class FileOperationResponseDto {
  @ApiProperty({
    description: 'Operation success status',example: true})
  success: boolean;

  @ApiProperty({
    description: 'Operation type performed',enum: FileOperationType,example: FileOperationType.UPLOAD
  })
  operation: FileOperationType;

  @ApiProperty({
    description: 'Operation ID',example: 'op_1704454800_abc123'})operationId: string;

  @ApiPropertyOptional({
    description: 'Upload result (if operation was upload)',type: FileUploadResultDto})
  uploadResult?: FileUploadResultDto;

  @ApiPropertyOptional({
    description: 'Download result (if operation was download)',type: FileDownloadResultDto})
  downloadResult?: FileDownloadResultDto;

  @ApiPropertyOptional({
    description: 'File information (for various operations)',type: FileInfoDto})
  fileInfo?: FileInfoDto;

  @ApiProperty({
    description: 'Operation processing time in milliseconds',example: 45000})
  processingTimeMs: number;

  @ApiPropertyOptional({
    description: 'Operation error message if failed',example: 'Failed to access target directory'})errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Detailed error information',example: { errorCode: 'PERMISSION_DENIED', details: 'Insufficient permissions' }})errorDetails?: any;

  @ApiPropertyOptional({
    description: 'Operation warnings',example: ['File already exists, overwriting', 'Large file may take longer to process']})warnings?: string[];

  @ApiPropertyOptional({
    description: 'Additional operation metadata',example: { sourceElement: '#fileUpload', targetDirectory: '/uploads' }})metadata?: Record<string, any>;
}

/**
 * Bulk file operation response
 */
export class BulkFileOperationResponseDto {
  @ApiProperty({
    description: 'Overall operation success status',example: true})
  success: boolean;

  @ApiProperty({
    description: 'Bulk operation ID',example: 'bulk_1704454800_xyz789'})operationId: string;

  @ApiProperty({
    description: 'Total number of operations',example: 10})
  totalOperations: number;

  @ApiProperty({
    description: 'Number of successful operations',example: 8})
  successfulOperations: number;

  @ApiProperty({
    description: 'Number of failed operations',example: 2})
  failedOperations: number;

  @ApiProperty({
    description: 'Individual operation results',type: [FileOperationResponseDto]})
  results: FileOperationResponseDto[];

  @ApiProperty({
    description: 'Total processing time in milliseconds',example: 120000})
  totalProcessingTimeMs: number;

  @ApiProperty({
    description: 'Bulk operation start time',example: '2024-01-15T10:30:00.000Z'})startTime: string;

  @ApiPropertyOptional({
    description: 'Bulk operation completion time',example: '2024-01-15T10:32:00.000Z'})endTime?: string;

  @ApiPropertyOptional({
    description: 'Overall progress information',type: FileOperationProgressDto})
  overallProgress?: FileOperationProgressDto;

  @ApiPropertyOptional({
    description: 'Operation summary statistics',example: {totalFilesSizeBytes: 50331648,
      averageOperationTime: 12000,
      fastestOperation: 2000,
      slowestOperation: 45000
    }
  })
  statistics?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Global error message if bulk operation failed',example: 'Bulk operation timeout exceeded'})errorMessage?: string;
}

/**
 * File listing response
 */
export class FileListingResponseDto {
  @ApiProperty({
    description: 'Directory path',example: '/uploads/documents'})path: string;

  @ApiProperty({
    description: 'List of files and directories',type: [FileInfoDto]})
  items: FileInfoDto[];

  @ApiProperty({
    description: 'Total number of items',example: 25})
  totalItems: number;

  @ApiProperty({
    description: 'Number of files',example: 20})
  fileCount: number;

  @ApiProperty({
    description: 'Number of directories',example: 5})
  directoryCount: number;

  @ApiProperty({
    description: 'Total size of all files in bytes',example: 104857600})
  totalSize: number;

  @ApiPropertyOptional({
    description: 'Listing filters applied',example: { extensions: ['.pdf', '.doc'], minSize: 1024 }})appliedFilters?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Pagination information',example: { page: 1, pageSize: 50, totalPages: 1 }})
  pagination?: Record<string, any>;

  @ApiProperty({
    description: 'Listing timestamp',example: '2024-01-15T10:30:00.000Z'})timestamp: string;
}

/**
 * File synchronization response
 */
export class FileSyncResponseDto {
  @ApiProperty({
    description: 'Synchronization success status',example: true})
  success: boolean;

  @ApiProperty({
    description: 'Sync operation ID',example: 'sync_1704454800_xyz789'})operationId: string;

  @ApiProperty({
    description: 'Source path',example: '/local/source'})source: string;

  @ApiProperty({
    description: 'Target path',example: '/remote/target'})target: string;

  @ApiProperty({
    description: 'Synchronization direction',example: 'upload'})direction: string;

  @ApiProperty({
    description: 'Files that were synchronized',type: [FileInfoDto]})
  synchronizedFiles: FileInfoDto[];

  @ApiProperty({
    description: 'Number of files synchronized',example: 15})
  filesSync: number;

  @ApiProperty({
    description: 'Number of files skipped',example: 3})
  filesSkipped: number;

  @ApiProperty({
    description: 'Number of files with errors',example: 1})
  filesError: number;

  @ApiProperty({
    description: 'Total bytes synchronized',example: 52428800})
  totalBytesSync: number;

  @ApiProperty({
    description: 'Sync duration in milliseconds',example: 180000})
  durationMs: number;

  @ApiPropertyOptional({
    description: 'Sync error details',example: [{ file: 'locked.txt', error: 'File is locked by another process' }]})errors?: any[];

  @ApiPropertyOptional({
    description: 'Conflict resolution actions taken',example: [{ file: 'duplicate.txt', action: 'renamed to duplicate_1.txt' }]})conflictResolutions?: any[];

  @ApiProperty({
    description: 'Sync completion timestamp',example: '2024-01-15T10:33:00.000Z'
  })
  timestamp: string;
}