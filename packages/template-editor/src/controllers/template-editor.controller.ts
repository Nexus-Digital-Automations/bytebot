/**
 * Template Editor Controller
 * RESTful API endpoints for template editing and management
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpException,
  Logger,
  ValidationPipe,
  UsePipes,
  UseInterceptors,
  UploadedFile
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiConsumes,
  ApiProduces
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

// Core services
import { TemplateEditorService } from '../core/template-editor.service';

// DTOs
import { CreateTemplateVersionDto } from '../dto/create-template-version.dto';
import { UpdateTemplateVersionDto } from '../dto/update-template-version.dto';
import { TemplateValidationDto } from '../dto/template-validation.dto';

// Types
import {
  TemplateVersion,
  EditorSession,
  TemplateSnapshot,
  TemplateDiff,
  TemplateValidationResult,
  TemplatePreview
} from '../types/template-editor.types';

/**
 * Controller handling all template editor operations
 * Provides comprehensive API for template creation, editing, and collaboration
 */
@ApiTags('Template Editor')
@Controller('template-editor')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class TemplateEditorController {
  private readonly logger = new Logger(TemplateEditorController.name);

  constructor(
    private readonly templateEditorService: TemplateEditorService
  ) {}

  /**
   * Create a new template version
   */
  @Post('templates/:templateId/versions')
  @ApiOperation({
    summary: 'Create new template version',
    description: 'Creates a new version of an existing template with content and metadata'
  })
  @ApiParam({
    name: 'templateId',
    description: 'Template identifier',
    example: 'template_12345'
  })
  @ApiBody({
    type: CreateTemplateVersionDto,
    description: 'Template version creation data'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Template version created successfully'
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid template data'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Template not found'
  })
  @ApiConsumes('application/json')
  @ApiProduces('application/json')
  async createTemplateVersion(
    @Param('templateId') templateId: string,
    @Body() createVersionDto: CreateTemplateVersionDto
  ): Promise<TemplateVersion> {
    this.logger.log(`Creating new version for template: ${templateId}`);

    try {
      const version = await this.templateEditorService.createTemplateVersion(
        templateId,
        createVersionDto.content,
        createVersionDto.userId
      );

      return version;

    } catch (error) {
      this.logger.error(`Error creating template version: ${error.message}`);

      if (error.message.includes('not found')) {
        throw new HttpException(
          {
            message: 'Template not found',
            details: error.message,
            timestamp: new Date().toISOString()
          },
          HttpStatus.NOT_FOUND
        );
      }

      throw new HttpException(
        {
          message: 'Failed to create template version',
          details: error.message,
          timestamp: new Date().toISOString()
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Update an existing template version
   */
  @Put('versions/:versionId')
  @ApiOperation({
    summary: 'Update template version',
    description: 'Updates content and metadata of an existing template version'
  })
  @ApiParam({
    name: 'versionId',
    description: 'Version identifier',
    example: 'version_12345'
  })
  @ApiBody({
    type: UpdateTemplateVersionDto,
    description: 'Template version update data'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template version updated successfully'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Version not found'
  })
  @ApiConsumes('application/json')
  @ApiProduces('application/json')
  async updateTemplateVersion(
    @Param('versionId') versionId: string,
    @Body() updateVersionDto: UpdateTemplateVersionDto
  ): Promise<TemplateVersion> {
    this.logger.log(`Updating template version: ${versionId}`);

    try {
      const version = await this.templateEditorService.updateTemplateVersion(
        versionId,
        updateVersionDto.content,
        updateVersionDto.userId,
        updateVersionDto.commitMessage
      );

      return version;

    } catch (error) {
      this.logger.error(`Error updating template version: ${error.message}`);

      if (error.message.includes('not found')) {
        throw new HttpException(
          {
            message: 'Template version not found',
            details: error.message,
            timestamp: new Date().toISOString()
          },
          HttpStatus.NOT_FOUND
        );
      }

      throw new HttpException(
        {
          message: 'Failed to update template version',
          details: error.message,
          timestamp: new Date().toISOString()
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Validate template content and syntax
   */
  @Post('validate')
  @ApiOperation({
    summary: 'Validate template',
    description: 'Validates template syntax, variables, and performance characteristics'
  })
  @ApiBody({
    type: TemplateValidationDto,
    description: 'Template validation request'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Validation completed successfully'
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid validation request'
  })
  @ApiConsumes('application/json')
  @ApiProduces('application/json')
  async validateTemplate(
    @Body() validationDto: TemplateValidationDto
  ): Promise<TemplateValidationResult> {
    this.logger.log('Validating template content');

    try {
      const result = await this.templateEditorService.validateTemplate(
        validationDto.content,
        validationDto.format
      );

      return result;

    } catch (error) {
      this.logger.error(`Error validating template: ${error.message}`);

      throw new HttpException(
        {
          message: 'Template validation failed',
          details: error.message,
          timestamp: new Date().toISOString()
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Generate template preview with sample data
   */
  @Post('templates/:templateId/versions/:versionId/preview')
  @ApiOperation({
    summary: 'Generate template preview',
    description: 'Generates a preview of the template using provided sample data'
  })
  @ApiParam({
    name: 'templateId',
    description: 'Template identifier',
    example: 'template_12345'
  })
  @ApiParam({
    name: 'versionId',
    description: 'Version identifier',
    example: 'version_12345'
  })
  @ApiBody({
    description: 'Sample data for preview generation',
    example: {
      title: 'Sample Document',
      author: 'John Doe',
      date: '2024-09-22'
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Preview generated successfully'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Template or version not found'
  })
  @ApiConsumes('application/json')
  @ApiProduces('application/json')
  async generatePreview(
    @Param('templateId') templateId: string,
    @Param('versionId') versionId: string,
    @Body() sampleData: Record<string, any>
  ): Promise<TemplatePreview> {
    this.logger.log(`Generating preview for template ${templateId}, version ${versionId}`);

    try {
      const preview = await this.templateEditorService.generatePreview(
        templateId,
        versionId,
        sampleData
      );

      return preview;

    } catch (error) {
      this.logger.error(`Error generating preview: ${error.message}`);

      if (error.message.includes('not found')) {
        throw new HttpException(
          {
            message: 'Template or version not found',
            details: error.message,
            timestamp: new Date().toISOString()
          },
          HttpStatus.NOT_FOUND
        );
      }

      throw new HttpException(
        {
          message: 'Preview generation failed',
          details: error.message,
          timestamp: new Date().toISOString()
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Create template snapshot for version control
   */
  @Post('templates/:templateId/versions/:versionId/snapshots')
  @ApiOperation({
    summary: 'Create template snapshot',
    description: 'Creates a snapshot of the current template state for version control'
  })
  @ApiParam({
    name: 'templateId',
    description: 'Template identifier',
    example: 'template_12345'
  })
  @ApiParam({
    name: 'versionId',
    description: 'Version identifier',
    example: 'version_12345'
  })
  @ApiBody({
    description: 'Current template content',
    example: { content: '<html><body>{{title}}</body></html>' }
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Snapshot created successfully'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Template or version not found'
  })
  @ApiConsumes('application/json')
  @ApiProduces('application/json')
  async createSnapshot(
    @Param('templateId') templateId: string,
    @Param('versionId') versionId: string,
    @Body() data: { content: string }
  ): Promise<TemplateSnapshot> {
    this.logger.log(`Creating snapshot for template ${templateId}, version ${versionId}`);

    try {
      const snapshot = await this.templateEditorService.createTemplateSnapshot(
        templateId,
        versionId,
        data.content,
        'manual'
      );

      return snapshot;

    } catch (error) {
      this.logger.error(`Error creating snapshot: ${error.message}`);

      throw new HttpException(
        {
          message: 'Snapshot creation failed',
          details: error.message,
          timestamp: new Date().toISOString()
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Generate diff between two template versions
   */
  @Get('versions/:sourceVersionId/diff/:targetVersionId')
  @ApiOperation({
    summary: 'Generate version diff',
    description: 'Creates a detailed diff between two template versions'
  })
  @ApiParam({
    name: 'sourceVersionId',
    description: 'Source version identifier',
    example: 'version_12345'
  })
  @ApiParam({
    name: 'targetVersionId',
    description: 'Target version identifier',
    example: 'version_12346'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Diff generated successfully'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'One or both versions not found'
  })
  @ApiProduces('application/json')
  async generateVersionDiff(
    @Param('sourceVersionId') sourceVersionId: string,
    @Param('targetVersionId') targetVersionId: string
  ): Promise<TemplateDiff> {
    this.logger.log(`Generating diff between versions: ${sourceVersionId} -> ${targetVersionId}`);

    try {
      const diff = await this.templateEditorService.createVersionDiff(
        sourceVersionId,
        targetVersionId
      );

      return diff;

    } catch (error) {
      this.logger.error(`Error generating diff: ${error.message}`);

      if (error.message.includes('not found')) {
        throw new HttpException(
          {
            message: 'One or both versions not found',
            details: error.message,
            timestamp: new Date().toISOString()
          },
          HttpStatus.NOT_FOUND
        );
      }

      throw new HttpException(
        {
          message: 'Diff generation failed',
          details: error.message,
          timestamp: new Date().toISOString()
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get active collaborators for a template
   */
  @Get('templates/:templateId/collaborators')
  @ApiOperation({
    summary: 'Get active collaborators',
    description: 'Retrieves list of users currently editing the template'
  })
  @ApiParam({
    name: 'templateId',
    description: 'Template identifier',
    example: 'template_12345'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Collaborators retrieved successfully'
  })
  @ApiProduces('application/json')
  async getActiveCollaborators(
    @Param('templateId') templateId: string
  ): Promise<{ collaborators: EditorSession[] }> {
    this.logger.log(`Getting active collaborators for template: ${templateId}`);

    try {
      const collaborators = this.templateEditorService.getActiveCollaborators(templateId);

      return { collaborators };

    } catch (error) {
      this.logger.error(`Error getting collaborators: ${error.message}`);

      throw new HttpException(
        {
          message: 'Failed to retrieve collaborators',
          details: error.message,
          timestamp: new Date().toISOString()
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Import template from file
   */
  @Post('import')
  @ApiOperation({
    summary: 'Import template',
    description: 'Imports a template from uploaded file (JSON, YAML, or ZIP)'
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Template imported successfully'
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid file format or content'
  })
  @UseInterceptors(FileInterceptor('file'))
  async importTemplate(
    @UploadedFile() file: Express.Multer.File,
    @Body() options: any
  ): Promise<{ message: string; templateId?: string }> {
    this.logger.log(`Importing template from file: ${file.originalname}`);

    try {
      // TODO: Implement template import logic
      // - Parse file content
      // - Validate template structure
      // - Create template and versions
      // - Handle conflicts and merging

      return {
        message: 'Template import not yet implemented',
        templateId: undefined
      };

    } catch (error) {
      this.logger.error(`Error importing template: ${error.message}`);

      throw new HttpException(
        {
          message: 'Template import failed',
          details: error.message,
          timestamp: new Date().toISOString()
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Export template to file
   */
  @Get('templates/:templateId/export')
  @ApiOperation({
    summary: 'Export template',
    description: 'Exports template with all versions and metadata'
  })
  @ApiParam({
    name: 'templateId',
    description: 'Template identifier',
    example: 'template_12345'
  })
  @ApiQuery({
    name: 'format',
    required: false,
    description: 'Export format (json, yaml, zip)',
    example: 'json'
  })
  @ApiQuery({
    name: 'includeVersions',
    required: false,
    description: 'Include all versions',
    example: true
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template exported successfully'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Template not found'
  })
  async exportTemplate(
    @Param('templateId') templateId: string,
    @Query('format') format = 'json',
    @Query('includeVersions') includeVersions = true
  ): Promise<any> {
    this.logger.log(`Exporting template: ${templateId} in format: ${format}`);

    try {
      // TODO: Implement template export logic
      // - Gather template data
      // - Include versions if requested
      // - Format according to requested format
      // - Create downloadable file

      return {
        message: 'Template export not yet implemented',
        format,
        includeVersions
      };

    } catch (error) {
      this.logger.error(`Error exporting template: ${error.message}`);

      if (error.message.includes('not found')) {
        throw new HttpException(
          {
            message: 'Template not found',
            details: error.message,
            timestamp: new Date().toISOString()
          },
          HttpStatus.NOT_FOUND
        );
      }

      throw new HttpException(
        {
          message: 'Template export failed',
          details: error.message,
          timestamp: new Date().toISOString()
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}