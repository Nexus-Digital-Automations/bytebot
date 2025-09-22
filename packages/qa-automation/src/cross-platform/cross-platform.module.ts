/**
 * Cross-Platform Test Execution Module
 *
 * Comprehensive test execution engine supporting web, mobile, desktop, and API testing
 * across multiple platforms and environments. Provides unified execution interface
 * with platform-specific optimizations and parallel execution capabilities.
 *
 * @fileoverview NestJS module for cross-platform test execution
 * @author Bytebot Team
 * @version 1.0.0
 */

import { Module, Logger } from '@nestjs/common';
import { CrossPlatformController } from './cross-platform.controller';
import { CrossPlatformService } from './cross-platform.service';
import { WebTestExecutor } from './executors/web-test-executor.service';
import { MobileTestExecutor } from './executors/mobile-test-executor.service';
import { DesktopTestExecutor } from './executors/desktop-test-executor.service';
import { APITestExecutor } from './executors/api-test-executor.service';
import { TestEnvironmentManager } from './services/test-environment-manager.service';
import { ParallelExecutionService } from './services/parallel-execution.service';
import { ResultAggregationService } from './services/result-aggregation.service';

@Module({
  controllers: [CrossPlatformController],
  providers: [
    CrossPlatformService,
    WebTestExecutor,
    MobileTestExecutor,
    DesktopTestExecutor,
    APITestExecutor,
    TestEnvironmentManager,
    ParallelExecutionService,
    ResultAggregationService,
    {
      provide: Logger,
      useFactory: () => new Logger('CrossPlatform'),
    },
  ],
  exports: [CrossPlatformService],
})
export class CrossPlatformModule {
  private readonly logger = new Logger(CrossPlatformModule.name);

  constructor() {
    this.logger.log('Cross-Platform Test Execution module initialized');
  }
}