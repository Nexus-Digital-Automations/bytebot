/**
 * Document Automation Package - Main Export Index
 * Comprehensive document automation system for enterprise applications
 */

// Core Module
export { DocumentAutomationModule } from './document-automation.module';

// Core Engine
export { DocumentEngineService } from './core/document-engine.service';

// Services
export { TemplateProcessor } from './services/template-processor.service';
export { FormatConverter } from './services/format-converter.service';
export { ValidationService } from './services/validation.service';
export { MetricsCollector } from './services/metrics-collector.service';
export { AuditLogger } from './services/audit-logger.service';
export { TemplateManagementService } from './services/template-management.service';
export { WorkflowEngineService } from './services/workflow-engine.service';
export { BatchProcessingService } from './services/batch-processing.service';
export { DocumentAssemblyService } from './services/document-assembly.service';
export { DataIntegrationService } from './services/data-integration.service';

// Controllers
export { DocumentGenerationController } from './controllers/document-generation.controller';
export { TemplateManagementController } from './controllers/template-management.controller';
export { WorkflowController } from './controllers/workflow.controller';
export { BatchProcessingController } from './controllers/batch-processing.controller';
export { DocumentAssemblyController } from './controllers/document-assembly.controller';

// DTOs
export { CreateDocumentGenerationRequestDto, CreateBatchGenerationRequestDto } from './dto/create-document-generation-request.dto';
export { DocumentGenerationResponseDto, ProcessingStatusResponseDto, BatchProcessingResponseDto } from './dto/document-generation-response.dto';

// Types
export * from './types/document.types';