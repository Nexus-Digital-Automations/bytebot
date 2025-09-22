/**
 * Continuous Monitoring Module
 *
 * NestJS module providing continuous quality monitoring capabilities
 * including CI/CD pipeline integration, real-time metrics collection,
 * and automated alerting for enterprise QA workflows.
 *
 * @fileoverview NestJS module for continuous monitoring
 * @author Bytebot Team
 * @version 1.0.0
 */

import { Module, Logger } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';

@Module({
  providers: [
    MonitoringService,
    {
      provide: Logger,
      useFactory: () => new Logger('Monitoring'),
    },
  ],
  exports: [MonitoringService],
})
export class MonitoringModule {
  private readonly logger = new Logger(MonitoringModule.name);

  constructor() {
    this.logger.log('Continuous Monitoring module initialized');
  }
}