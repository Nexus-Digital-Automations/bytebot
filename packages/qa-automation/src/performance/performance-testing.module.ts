/**
 * Performance Testing Module
 *
 * NestJS module providing comprehensive performance testing capabilities
 * including load simulation, bottleneck detection, resource monitoring,
 * and advanced performance profiling.
 *
 * @fileoverview NestJS module for performance testing
 * @author Bytebot Team
 * @version 1.0.0
 */

import { Module, Logger } from '@nestjs/common';
import { PerformanceTestingService } from './performance-testing.service';

@Module({
  providers: [
    PerformanceTestingService,
    {
      provide: Logger,
      useFactory: () => new Logger('PerformanceTesting'),
    },
  ],
  exports: [PerformanceTestingService],
})
export class PerformanceTestingModule {
  private readonly logger = new Logger(PerformanceTestingModule.name);

  constructor() {
    this.logger.log('Performance Testing module initialized');
  }
}