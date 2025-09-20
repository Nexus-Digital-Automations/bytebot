import { Module } from '@nestjs/common';
import { FormAutomationController } from './form-automation.controller';
import { FormAutomationService } from './form-automation.service';
import { ComputerUseModule } from '../computer-use/computer-use.module';

/**
 * Form Automation Module
 *
 * Provides comprehensive form automation capabilities including:
 * - Intelligent form detection and analysis
 * - Automated form filling with validation
 * - Multi-step form submission handling
 * - Auto-complete with user profile data
 * - Form validation and error handling
 * - Screenshot capture for debugging
 *
 * Dependencies:
 * - ComputerUseModule: For browser automation and computer vision
 * - Common modules: Security, validation, and authentication
 */
@Module({
  imports: [ComputerUseModule],
  controllers: [FormAutomationController],
  providers: [FormAutomationService],
  exports: [FormAutomationService],
})
export class FormAutomationModule {}