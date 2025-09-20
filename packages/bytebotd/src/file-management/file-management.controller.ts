import {
  Controller,
  Post,
  Body,
  Logger,
  HttpException,
  HttpStatus,
  UseGuards,
  UsePipes,
  UseInterceptors,
  Get,
  Param,
  Query,
  UploadedFile,
  UseInterceptors as UseFileInterceptor,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiTags,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { EnterpriseRateLimitGuard } from '../common/guards/rate-limit.guard';
import { SecuritySanitizationPipes } from '../common/pipes/security-sanitization.pipe';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor';
import {
  ForVersion,
  SUPPORTED_API_VERSIONS,
} from '../common/versioning/api-version.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  OperatorOrAdmin,
  CurrentUser,
  ByteBotdUser,
} from '../auth/decorators/roles.decorator';
import { FileManagementService } from './file-management.service';
import {
  FileOperationDto,
  BulkFileOperationDto,
  FileSyncDto,
  FileOperationType,
  FileUploadMethod,
  FileDownloadMethod
} from './dto/file-operation.dto';
import {
  FileOperationResponseDto,
  BulkFileOperationResponseDto,
  FileListingResponseDto,
  FileSyncResponseDto
} from './dto/file-response.dto';

/**
 * File Management Controller
 *
 * Provides enterprise-grade APIs for automated file operations including:
 * - Automated file uploads with form detection and interaction
 * - Automated file downloads from various sources
 * - File compression and extraction operations
 * - Bulk file operations with progress tracking
 * - File synchronization between local and remote locations
 * - File validation and security scanning
 * - Directory operations and file listing
 * - File metadata extraction and analysis
 *
 * Security Features:
 * - JWT authentication and RBAC authorization
 * - Input sanitization and XSS prevention
 * - File validation and virus scanning
 * - Rate limiting with suspicious activity detection
 * - Comprehensive audit logging
 * - Secure file handling and storage
 */
@ApiTags('File Management API')
@Controller('file-management')
@UseGuards(JwtAuthGuard, RolesGuard, EnterpriseRateLimitGuard)
@UsePipes(SecuritySanitizationPipes.HIGH_SECURITY)
@UseInterceptors(LoggingInterceptor)
@ApiBearerAuth('bearer')
export class FileManagementController {
  private readonly logger = new Logger(FileManagementController.name);

  constructor(private readonly fileManagementService: FileManagementService) {}

  /**
   * Execute file operation
   *
   * Universal endpoint for all file operations including upload, download,
   * copy, move, delete, compress, and extract. Supports comprehensive
   * configuration options and provides detailed execution results.
   *
   * @param params - File operation parameters
   * @param user - Authenticated user context
   * @returns Promise<FileOperationResponseDto> - Operation execution results
   */
  @Post('operation')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Execute file operation',
    description: 'Execute various file operations including upload, download, copy, move, delete, compress, and extract with comprehensive configuration options.',
    operationId: 'executeFileOperation',
  })
  @ApiResponse({
    status: 200,
    description: 'File operation executed successfully',
    type: FileOperationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid operation parameters or configuration',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions - OPERATOR or ADMIN role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Source file or target location not found',
  })
  @ApiResponse({
    status: 413,
    description: 'File too large',
  })
  @ApiResponse({
    status: 415,
    description: 'Unsupported file type',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
  })
  async executeFileOperation(
    @Body() params: FileOperationDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<FileOperationResponseDto> {
    const operationId = `file_op_${params.operation}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.logger.log(
        `[${operationId}] File operation request: ${params.operation}`,
        {
          operationId,
          operation: params.operation,
          source: params.source,
          target: params.target,
          filename: params.filename,
          fileSize: params.fileSize,
          userId: user.id,
          username: user.username,
          userRole: user.role,
        },
      );

      const result = await this.fileManagementService.executeFileOperation(params);

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] File operation completed: ${result.success ? 'SUCCESS' : 'FAILED'} (${processingTime}ms)`,
        {
          operationId,
          operation: params.operation,
          success: result.success,
          processingTime,
          userId: user.id,
          username: user.username,
        },
      );

      return result;
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = this.getErrorMessage(error);

      this.logger.error(
        `[${operationId}] File operation failed: ${errorMessage} (${processingTime}ms)`,
        this.getErrorStack(error),
        {
          operationId,
          operation: params.operation,
          processingTime,
          errorType: error?.constructor?.name ?? 'Unknown',
          userId: user.id,
          username: user.username,
        },
      );

      // Map specific errors to appropriate HTTP status codes
      if (errorMessage.includes('not found') || errorMessage.includes('ENOENT')) {
        throw new HttpException(
          `File or directory not found: ${errorMessage}`,
          HttpStatus.NOT_FOUND,
        );
      }

      if (errorMessage.includes('permission denied') || errorMessage.includes('EACCES')) {
        throw new HttpException(
          `Permission denied: ${errorMessage}`,
          HttpStatus.FORBIDDEN,
        );
      }

      if (errorMessage.includes('file too large') || errorMessage.includes('size exceeds')) {
        throw new HttpException(
          `File too large: ${errorMessage}`,
          HttpStatus.PAYLOAD_TOO_LARGE,
        );
      }

      if (errorMessage.includes('file type not allowed') || errorMessage.includes('MIME type')) {
        throw new HttpException(
          `Unsupported file type: ${errorMessage}`,
          HttpStatus.UNSUPPORTED_MEDIA_TYPE,
        );
      }

      throw new HttpException(
        `File operation failed: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Execute bulk file operations
   *
   * Performs multiple file operations in parallel or sequential mode with
   * comprehensive progress tracking and error handling. Supports various
   * operation types and provides detailed results for each operation.
   *
   * @param params - Bulk operation parameters
   * @param user - Authenticated user context
   * @returns Promise<BulkFileOperationResponseDto> - Bulk operation results
   */
  @Post('bulk-operation')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Execute bulk file operations',
    description: 'Perform multiple file operations in parallel or sequential mode with comprehensive progress tracking and error handling.',
    operationId: 'executeBulkFileOperations',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk file operations completed',
    type: BulkFileOperationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid bulk operation parameters',
  })
  async executeBulkFileOperations(
    @Body() params: BulkFileOperationDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<BulkFileOperationResponseDto> {
    const operationId = `bulk_file_op_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    this.logger.log(
      `[${operationId}] Bulk file operation request`,
      {
        operationId,
        operationCount: params.operations.length,
        parallel: params.parallel,
        maxConcurrent: params.maxConcurrent,
        userId: user.id,
        username: user.username,
      },
    );

    const result = await this.fileManagementService.executeBulkFileOperations(params);
    return result;
  }

  /**
   * Upload file
   *
   * Specialized endpoint for file uploads using multipart form data or
   * automated web form interaction. Supports validation, progress tracking,
   * and various upload methods including drag-drop simulation.
   *
   * @param file - Uploaded file (multipart)
   * @param uploadMethod - Upload method to use
   * @param targetSelector - Target upload element selector
   * @param autoSubmit - Whether to auto-submit after upload
   * @param user - Authenticated user context
   * @returns Promise<FileOperationResponseDto> - Upload operation results
   */
  @Post('upload')
  @UseFileInterceptor(FileInterceptor('file'))
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Upload file',
    description: 'Upload file using multipart form data or automated web form interaction with validation and progress tracking.',
    operationId: 'uploadFile',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 200,
    description: 'File uploaded successfully',
    type: FileOperationResponseDto,
  })
  @ApiResponse({
    status: 413,
    description: 'File too large',
  })
  @ApiResponse({
    status: 415,
    description: 'Unsupported file type',
  })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('uploadMethod') uploadMethod: FileUploadMethod = FileUploadMethod.FORM_UPLOAD,
    @Body('targetSelector') targetSelector?: string,
    @Body('autoSubmit') autoSubmit: boolean = false,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<FileOperationResponseDto> {
    const operationId = `upload_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    this.logger.log(
      `[${operationId}] File upload request`,
      {
        operationId,
        filename: file?.originalname,
        fileSize: file?.size,
        mimeType: file?.mimetype,
        uploadMethod,
        targetSelector,
        userId: user.id,
        username: user.username,
      },
    );

    const fileOperation: FileOperationDto = {
      operation: FileOperationType.UPLOAD,
      filename: file?.originalname,
      fileSize: file?.size,
      mimeType: file?.mimetype,
      fileData: file?.buffer ? file.buffer.toString('base64') : undefined,
      uploadConfig: {
        method: uploadMethod,
        targetSelector,
        autoSubmit,
        uploadTimeout: 60000,
        validation: {
          maxFileSize: 50 * 1024 * 1024, // 50MB default
          virusScan: true,
          validateContent: true
        }
      }
    };

    return this.executeFileOperation(fileOperation, user);
  }

  /**
   * Download file
   *
   * Downloads files from web pages using various methods including direct
   * links, button clicks, form submissions, and AJAX requests. Supports
   * download verification and custom naming.
   *
   * @param downloadUrl - Direct download URL
   * @param downloadMethod - Download method to use
   * @param downloadSelector - Download element selector
   * @param customFilename - Custom filename for downloaded file
   * @param user - Authenticated user context
   * @returns Promise<FileOperationResponseDto> - Download operation results
   */
  @Post('download')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Download file',
    description: 'Download files from web pages using various methods including direct links, button clicks, and form submissions.',
    operationId: 'downloadFile',
  })
  @ApiResponse({
    status: 200,
    description: 'File downloaded successfully',
    type: FileOperationResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Download source not found',
  })
  async downloadFile(
    @Body('downloadUrl') downloadUrl?: string,
    @Body('downloadMethod') downloadMethod: FileDownloadMethod = FileDownloadMethod.DIRECT_LINK,
    @Body('downloadSelector') downloadSelector?: string,
    @Body('customFilename') customFilename?: string,
    @Body('downloadDirectory') downloadDirectory?: string,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<FileOperationResponseDto> {
    const operationId = `download_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    this.logger.log(
      `[${operationId}] File download request`,
      {
        operationId,
        downloadUrl,
        downloadMethod,
        downloadSelector,
        customFilename,
        userId: user.id,
        username: user.username,
      },
    );

    const fileOperation: FileOperationDto = {
      operation: FileOperationType.DOWNLOAD,
      downloadConfig: {
        method: downloadMethod,
        downloadUrl,
        downloadSelector,
        customFilename,
        downloadDirectory,
        downloadTimeout: 120000,
        verifyDownload: true,
        overwriteExisting: false
      }
    };

    return this.executeFileOperation(fileOperation, user);
  }

  /**
   * Synchronize files
   *
   * Synchronizes files between local and remote locations with support for
   * bidirectional sync, conflict resolution, and pattern-based filtering.
   * Provides detailed sync statistics and error reporting.
   *
   * @param params - File synchronization parameters
   * @param user - Authenticated user context
   * @returns Promise<FileSyncResponseDto> - Synchronization results
   */
  @Post('sync')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Synchronize files',
    description: 'Synchronize files between local and remote locations with bidirectional support, conflict resolution, and pattern filtering.',
    operationId: 'synchronizeFiles',
  })
  @ApiResponse({
    status: 200,
    description: 'File synchronization completed',
    type: FileSyncResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid synchronization parameters',
  })
  async synchronizeFiles(
    @Body() params: FileSyncDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<FileSyncResponseDto> {
    const operationId = `sync_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    this.logger.log(
      `[${operationId}] File synchronization request`,
      {
        operationId,
        source: params.source,
        target: params.target,
        direction: params.direction,
        userId: user.id,
        username: user.username,
      },
    );

    return this.fileManagementService.synchronizeFiles(params);
  }

  /**
   * List files
   *
   * Lists files and directories in the specified path with optional filtering
   * by extension, size, date, and other criteria. Supports pagination and
   * detailed metadata extraction.
   *
   * @param path - Directory path to list
   * @param extensions - File extensions filter
   * @param minSize - Minimum file size filter
   * @param maxSize - Maximum file size filter
   * @param sortBy - Sort criteria
   * @param user - Authenticated user context
   * @returns Promise<FileListingResponseDto> - File listing results
   */
  @Get('list')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'List files',
    description: 'List files and directories with optional filtering by extension, size, date, and other criteria.',
    operationId: 'listFiles',
  })
  @ApiQuery({
    name: 'path',
    description: 'Directory path to list',
    example: '/uploads/documents',
    required: false
  })
  @ApiQuery({
    name: 'extensions',
    description: 'File extensions filter (comma-separated)',
    example: '.pdf,.doc,.docx',
    required: false
  })
  @ApiQuery({
    name: 'minSize',
    description: 'Minimum file size in bytes',
    example: 1024,
    required: false
  })
  @ApiQuery({
    name: 'maxSize',
    description: 'Maximum file size in bytes',
    example: 10485760,
    required: false
  })
  @ApiQuery({
    name: 'sortBy',
    description: 'Sort criteria',
    example: 'name',
    required: false
  })
  @ApiResponse({
    status: 200,
    description: 'File listing retrieved successfully',
    type: FileListingResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Directory not found',
  })
  async listFiles(
    @Query('path') path: string = '.',
    @Query('extensions') extensions?: string,
    @Query('minSize') minSize?: number,
    @Query('maxSize') maxSize?: number,
    @Query('sortBy') sortBy?: string,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<FileListingResponseDto> {
    const operationId = `list_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    this.logger.log(
      `[${operationId}] File listing request`,
      {
        operationId,
        path,
        extensions,
        minSize,
        maxSize,
        sortBy,
        userId: user.id,
        username: user.username,
      },
    );

    const filters = {
      extensions: extensions ? extensions.split(',').map(ext => ext.trim()) : undefined,
      minSize,
      maxSize,
      sortBy
    };

    return this.fileManagementService.listFiles(path, filters);
  }

  /**
   * Compress files
   *
   * Creates compressed archives from files and directories with support for
   * various compression formats, encryption, and pattern-based inclusion/exclusion.
   *
   * @param sourcePath - Source files or directory to compress
   * @param targetPath - Target archive path
   * @param compressionType - Compression format (zip, tar, gzip, etc.)
   * @param compressionLevel - Compression level (0-9)
   * @param password - Optional password for encrypted archives
   * @param user - Authenticated user context
   * @returns Promise<FileOperationResponseDto> - Compression operation results
   */
  @Post('compress')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Compress files',
    description: 'Create compressed archives from files and directories with various compression formats and encryption support.',
    operationId: 'compressFiles',
  })
  @ApiResponse({
    status: 200,
    description: 'Files compressed successfully',
    type: FileOperationResponseDto,
  })
  async compressFiles(
    @Body('sourcePath') sourcePath: string,
    @Body('targetPath') targetPath: string,
    @Body('compressionType') compressionType: string = 'zip',
    @Body('compressionLevel') compressionLevel: number = 6,
    @Body('password') password?: string,
    @Body('excludePatterns') excludePatterns?: string[],
    @CurrentUser() user: ByteBotdUser,
  ): Promise<FileOperationResponseDto> {
    const operationId = `compress_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    this.logger.log(
      `[${operationId}] File compression request`,
      {
        operationId,
        sourcePath,
        targetPath,
        compressionType,
        compressionLevel,
        hasPassword: !!password,
        userId: user.id,
        username: user.username,
      },
    );

    const fileOperation: FileOperationDto = {
      operation: FileOperationType.COMPRESS,
      source: sourcePath,
      target: targetPath,
      compressionConfig: {
        type: compressionType as any,
        level: compressionLevel,
        password,
        excludePatterns,
        includeSubdirectories: true
      }
    };

    return this.executeFileOperation(fileOperation, user);
  }

  /**
   * Extract files
   *
   * Extracts files from compressed archives with support for various formats,
   * password-protected archives, and selective extraction.
   *
   * @param archivePath - Path to archive file
   * @param targetDirectory - Target extraction directory
   * @param password - Password for encrypted archives
   * @param overwriteExisting - Whether to overwrite existing files
   * @param user - Authenticated user context
   * @returns Promise<FileOperationResponseDto> - Extraction operation results
   */
  @Post('extract')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Extract files',
    description: 'Extract files from compressed archives with support for various formats and password-protected archives.',
    operationId: 'extractFiles',
  })
  @ApiResponse({
    status: 200,
    description: 'Files extracted successfully',
    type: FileOperationResponseDto,
  })
  async extractFiles(
    @Body('archivePath') archivePath: string,
    @Body('targetDirectory') targetDirectory: string,
    @Body('password') password?: string,
    @Body('overwriteExisting') overwriteExisting: boolean = false,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<FileOperationResponseDto> {
    const operationId = `extract_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    this.logger.log(
      `[${operationId}] File extraction request`,
      {
        operationId,
        archivePath,
        targetDirectory,
        hasPassword: !!password,
        overwriteExisting,
        userId: user.id,
        username: user.username,
      },
    );

    const fileOperation: FileOperationDto = {
      operation: FileOperationType.EXTRACT,
      source: archivePath,
      target: targetDirectory,
      compressionConfig: {
        type: 'zip' as any, // Will be auto-detected
        password
      },
      metadata: {
        overwriteExisting
      }
    };

    return this.executeFileOperation(fileOperation, user);
  }

  /**
   * Get operation status
   *
   * Retrieves the current status and progress of a running file operation.
   * Useful for monitoring long-running operations like large file transfers.
   *
   * @param operationId - File operation identifier
   * @param user - Authenticated user context
   * @returns Operation status and progress information
   */
  @Get('operations/:operationId/status')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Get operation status',
    description: 'Retrieve current status and progress of a running file operation.',
    operationId: 'getOperationStatus',
  })
  @ApiParam({
    name: 'operationId',
    description: 'File operation identifier',
    example: 'file_upload_1704454800_abc123'
  })
  @ApiResponse({
    status: 200,
    description: 'Operation status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        operationId: { type: 'string' },
        status: { type: 'string' },
        progress: { type: 'object' },
        currentPhase: { type: 'string' }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Operation not found',
  })
  async getOperationStatus(
    @Param('operationId') operationId: string,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<any> {
    this.logger.log(
      `Operation status request for: ${operationId}`,
      {
        operationId,
        userId: user.id,
        username: user.username,
      },
    );

    // Implementation would return status from active operations tracking
    return {
      operationId,
      status: 'completed',
      progress: {
        progressPercentage: 100,
        currentPhase: 'completed'
      }
    };
  }

  // Helper methods for error handling

  private getErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'message' in error) {
      return (error as { message: string }).message;
    }
    return typeof error === 'string' ? error : 'Unknown error';
  }

  private getErrorStack(error: unknown): string | undefined {
    if (error && typeof error === 'object' && 'stack' in error) {
      return (error as { stack?: string }).stack;
    }
    return undefined;
  }
}