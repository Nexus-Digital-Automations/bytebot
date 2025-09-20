import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ComputerUseService } from './computer-use.service';
import { AsyncJobService } from './async-job.service';
import { JobResourceCleanupService } from './services/job-resource-cleanup.service';
import { JobStatusResultService } from './services/job-status-result.service';
import { PriorityJobQueueService } from './queues/priority-job-queue.service';
import { ComputerUseController } from './computer-use.controller';
import { JobStatusResultController } from './controllers/job-status-result.controller';
import { PriorityQueueController } from './queues/priority-queue.controller';
import { BackgroundJobWorkerService } from './workers/background-job-worker.service';
import { JobManagementService } from './job-management.service';
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
  controllers: [ComputerUseController, JobStatusResultController, PriorityQueueController],
  providers: [
    ComputerUseService,
    AsyncJobService,
    BackgroundJobWorkerService, // Enterprise-grade background worker system
    JobManagementService, // Redis-based job persistence and management
    JobResourceCleanupService, // Enterprise resource management and cleanup service
    JobStatusResultService, // Comprehensive job status tracking and result management
    PriorityJobQueueService, // Enterprise-grade thread-safe priority queue management
  ],
  exports: [
    ComputerUseService,
    AsyncJobService,
    BackgroundJobWorkerService, // Export background worker service
    JobManagementService, // Export job management service
    JobResourceCleanupService, // Export for use by other modules
    JobStatusResultService, // Export for use by other modules
    PriorityJobQueueService, // Export for use by other modules
  ],
})
export class ComputerUseModule {}
