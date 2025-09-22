/**
 * Template Editor Package - Main Export Index
 * Visual template editor with collaboration and version control
 */

// Core Module
export { TemplateEditorModule } from './template-editor.module';

// Core Service
export { TemplateEditorService } from './core/template-editor.service';

// Business Services
export { VersionControlService } from './services/version-control.service';
export { CollaborationService } from './services/collaboration.service';
export { TemplateValidationService } from './services/template-validation.service';
export { TemplateRenderingService } from './services/template-rendering.service';
export { SnapshotService } from './services/snapshot.service';
export { DiffService } from './services/diff.service';
export { ImportExportService } from './services/import-export.service';

// Controllers
export { TemplateEditorController } from './controllers/template-editor.controller';

// WebSocket Gateways
export { CollaborationGateway } from './websockets/collaboration.gateway';

// DTOs
export {
  CreateTemplateVersionDto,
  UpdateTemplateVersionDto,
  TemplateValidationDto,
  TemplatePreviewDto,
  CreateEditorSessionDto,
  TemplateCommentDto,
  TemplateMergeDto
} from './dto/create-template-version.dto';

// Types
export * from './types/template-editor.types';