import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ComputerUseService } from './computer-use.service';
import { AsyncJobService } from './async-job.service';
import { JobResourceCleanupService } from './services/job-resource-cleanup.service';
import { JobStatusResultService } from './services/job-status-result.service';
import { PriorityJobQueueService } from './queues/priority-job-queue.service';
import { ComputerUseController } from './computer-use.controller';
import { PriorityQueueController } from './queues/priority-queue.controller';
import { NutModule } from '../nut/nut.module';
import { CacheModule } from '../cache/cache.module';
import { MetricsModule } from '../metrics/metrics.module';
import { SecurityModule } from '../common/security/security.module';

@Module({
  imports: [
    NutModule,
    CacheModule, // Import cache service for result caching
    MetricsModule, // Import metrics service for performance monitoring
    SecurityModule, // Import security module for rate limiting providers
    ScheduleModule.forRoot(), // Enable cron-based scheduling for cleanup tasks
    EventEmitterModule.forRoot(), // Enable event-driven architecture for resource management
  ],
  controllers: [ComputerUseController, PriorityQueueController],
  providers: [
    ComputerUseService,
    AsyncJobService,
    JobResourceCleanupService, // Enterprise resource management and cleanup service
    JobStatusResultService, // Comprehensive job status tracking and result management
    PriorityJobQueueService, // Enterprise-grade thread-safe priority queue management
  ],
  exports: [
    ComputerUseService,
    AsyncJobService,
    JobResourceCleanupService, // Export for use by other modules
    JobStatusResultService, // Export for use by other modules
    PriorityJobQueueService, // Export for use by other modules
  ],
})
export class ComputerUseModule {}
