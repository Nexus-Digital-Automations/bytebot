/**
 * Accessibility Testing Module
 *
 * NestJS module providing comprehensive accessibility testing capabilities
 * including WCAG compliance validation, screen reader testing, and
 * accessibility scoring with detailed remediation guidance.
 *
 * @fileoverview NestJS module for accessibility testing
 * @author Bytebot Team
 * @version 1.0.0
 */

import { Module, Logger } from '@nestjs/common';
import { AccessibilityTestingService } from './accessibility-testing.service';

@Module({
  providers: [
    AccessibilityTestingService,
    {
      provide: Logger,
      useFactory: () => new Logger('AccessibilityTesting'),
    },
  ],
  exports: [AccessibilityTestingService],
})
export class AccessibilityTestingModule {
  private readonly logger = new Logger(AccessibilityTestingModule.name);

  constructor() {
    this.logger.log('Accessibility Testing module initialized');
  }
}