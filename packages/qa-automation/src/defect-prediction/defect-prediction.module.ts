/**
 * Defect Prediction Module
 *
 * NestJS module providing AI-powered defect prediction capabilities
 * including machine learning models, risk assessment, and predictive
 * analytics for proactive quality management.
 *
 * @fileoverview NestJS module for defect prediction
 * @author Bytebot Team
 * @version 1.0.0
 */

import { Module, Logger } from '@nestjs/common';
import { DefectPredictionService } from './defect-prediction.service';

@Module({
  providers: [
    DefectPredictionService,
    {
      provide: Logger,
      useFactory: () => new Logger('DefectPrediction'),
    },
  ],
  exports: [DefectPredictionService],
})
export class DefectPredictionModule {
  private readonly logger = new Logger(DefectPredictionModule.name);

  constructor() {
    this.logger.log('Defect Prediction module initialized');
  }
}