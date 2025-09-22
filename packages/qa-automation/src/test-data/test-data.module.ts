/**
 * Test Data Management Module
 *
 * NestJS module providing comprehensive test data management capabilities
 * including synthetic data generation, data masking, and test data lifecycle
 * management for enterprise testing scenarios.
 *
 * @fileoverview NestJS module for test data management
 * @author Bytebot Team
 * @version 1.0.0
 */

import { Module, Logger } from '@nestjs/common';
import { TestDataService } from './test-data.service';

@Module({
  providers: [
    TestDataService,
    {
      provide: Logger,
      useFactory: () => new Logger('TestData'),
    },
  ],
  exports: [TestDataService],
})
export class TestDataModule {
  private readonly logger = new Logger(TestDataModule.name);

  constructor() {
    this.logger.log('Test Data Management module initialized');
  }
}