import { Module } from '@nestjs/common';
import { WorkflowAutomationController } from './workflow-automation.controller';
import { WorkflowAutomationService } from './workflow-automation.service';
import { FormAutomationModule } from '../form-automation/form-automation.module';
import { DataExtractionModule } from '../data-extraction/data-extraction.module';
import { ComputerUseModule } from '../computer-use/computer-use.module';

/**
 * Workflow Automation Module
 *
 * Provides comprehensive workflow automation capabilities including:
 * - Multi-step workflow orchestration
 * - Conditional logic and branching
 * - Loop execution with various types
 * - Error handling and recovery
 * - Data transformation between steps
 * - Parallel and sequential execution modes
 * - Variable management and templating
 * - Screenshot capture and debugging
 *
 * Dependencies:
 * - FormAutomationModule: For form interaction steps
 * - DataExtractionModule: For data extraction steps
 * - ComputerUseModule: For computer automation steps
 * - Common modules: Security, validation, and authentication
 */
@Module({
  imports: [
    FormAutomationModule,
    DataExtractionModule,
    ComputerUseModule,
  ],
  controllers: [WorkflowAutomationController],
  providers: [WorkflowAutomationService],
  exports: [WorkflowAutomationService],
})
export class WorkflowAutomationModule {}