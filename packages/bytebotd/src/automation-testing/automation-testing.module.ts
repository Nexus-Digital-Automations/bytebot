import { Module } from '@nestjs/common';
import { AutomationTestController } from './automation-test.controller';
import { AutomationTestService } from './automation-test.service';
import { FormAutomationModule } from '../form-automation/form-automation.module';
import { DataExtractionModule } from '../data-extraction/data-extraction.module';
import { WorkflowAutomationModule } from '../workflow-automation/workflow-automation.module';
import { FileManagementModule } from '../file-management/file-management.module';
import { ContentMonitoringModule } from '../content-monitoring/content-monitoring.module';
import { ErrorHandlingModule } from '../common/error-handling/error-handling.module';

/**
 * Automation Testing Module
 *
 * Provides comprehensive testing and validation capabilities for all automation modules including:
 * - Unit testing for individual automation components
 * - Integration testing for cross-module workflows
 * - Performance testing for scalability validation
 * - Error handling and recovery validation
 * - End-to-end automation scenario testing
 * - API contract validation and compliance testing
 * - Load testing and stress testing capabilities
 * - Regression testing for automation reliability
 *
 * Features:
 * - Automated test discovery and execution
 * - Parallel test execution for performance
 * - Comprehensive test reporting and analytics
 * - Integration with CI/CD pipelines
 * - Test data management and isolation
 * - Mock and stub integration for controlled testing
 * - Performance benchmarking and monitoring
 * - Test coverage analysis and reporting
 *
 * Dependencies:
 * - All automation modules for comprehensive testing coverage
 * - Error handling module for recovery validation
 * - Common modules for security and validation
 *
 * This module provides the foundation for ensuring quality and reliability
 * across all automation capabilities through systematic testing and validation.
 */
@Module({
  imports: [
    FormAutomationModule,
    DataExtractionModule,
    WorkflowAutomationModule,
    FileManagementModule,
    ContentMonitoringModule,
    ErrorHandlingModule,
  ],
  controllers: [AutomationTestController],
  providers: [AutomationTestService],
  exports: [AutomationTestService],
})
export class AutomationTestingModule {}