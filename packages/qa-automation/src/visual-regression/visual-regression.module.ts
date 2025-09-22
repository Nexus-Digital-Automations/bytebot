/**
 * Visual Regression Testing Module
 *
 * NestJS module providing comprehensive visual regression testing capabilities
 * including pixel-perfect comparison, baseline management, and intelligent
 * difference detection with enterprise-grade reporting.
 *
 * @fileoverview NestJS module for visual regression testing
 * @author Bytebot Team
 * @version 1.0.0
 */

import { Module, Logger } from '@nestjs/common';
import { VisualRegressionService } from './visual-regression.service';

@Module({
  providers: [
    VisualRegressionService,
    {
      provide: Logger,
      useFactory: () => new Logger('VisualRegression'),
    },
  ],
  exports: [VisualRegressionService],
})
export class VisualRegressionModule {
  private readonly logger = new Logger(VisualRegressionModule.name);

  constructor() {
    this.logger.log('Visual Regression Testing module initialized');
  }
}