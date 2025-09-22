import { Module } from '@nestjs/common';
import { FileManagementController } from './file-management.controller';
import { FileManagementService } from './file-management.service';
import { ComputerUseModule } from '../computer-use/computer-use.module';

/**
 * File Management Module
 *
 * Provides comprehensive file management capabilities including:
 * - Automated file uploads with form detection and interaction
 * - Automated file downloads from various sources
 * - File compression and extraction operations
 * - Bulk file operations with progress tracking
 * - File synchronization between local and remote locations
 * - File validation and security scanning
 * - Directory operations and file listing
 * - File metadata extraction and analysis
 *
 * Dependencies:
 * - ComputerUseModule: For browser automation and file interaction
 * - Common modules: Security, validation, and authentication
 */
@Module({
  imports: [ComputerUseModule],
  controllers: [FileManagementController],
  providers: [FileManagementService],
  exports: [FileManagementService],
})
export class FileManagementModule {}
