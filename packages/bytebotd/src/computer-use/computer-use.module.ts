import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ComputerUseService } from './computer-use.service';
import { AsyncJobService } from './async-job.service';
import { EnhancedAsyncJobService } from './enhanced-async-job.service';
import { JobEventsGateway } from './job-events.gateway';
import { JobResourceCleanupService } from './services/job-resource-cleanup.service';
import { JobStatusResultService } from './services/job-status-result.service';
import { JobMonitoringEnhancedService } from './services/job-monitoring-enhanced.service';
import { PriorityJobQueueService } from './queues/priority-job-queue.service';
import { ComputerUseController } from './computer-use.controller';
import { EnhancedJobMonitoringController } from './controllers/enhanced-job-monitoring.controller';
import { JobStatusResultController } from './controllers/job-status-result.controller';
import { PriorityQueueController } from './queues/priority-queue.controller';
import { JobCancellationController } from './controllers/job-cancellation-controller';
import { BackgroundJobWorkerService } from './workers/background-job-worker.service';
import { JobManagementService } from './job-management.service';
import { JobCancellationTimeoutService } from './services/job-cancellation-timeout.service';
import { ComprehensiveJobManagementModule } from './comprehensive-job-management.module';
import { NutModule } from '../nut/nut.module';
import { CacheModule } from '../cache/cache.module';
import { MetricsModule } from '../metrics/metrics.module';
import { SecurityModule } from '../common/security/security.module';

@Module({
  imports: [
    ComprehensiveJobManagementModule, // Import comprehensive job management system
    NutModule,
    CacheModule, // Import cache service for result caching
    MetricsModule, // Import metrics service for performance monitoring
    SecurityModule, // Import security module for rate limiting providers
    ScheduleModule.forRoot(), // Enable cron-based scheduling for cleanup tasks
    EventEmitterModule.forRoot(), // Enable event-driven architecture for resource management
  ],
  controllers: [
    ComputerUseController,
    EnhancedJobMonitoringController,
    JobStatusResultController,
    PriorityQueueController,
    JobCancellationController,
  ],
  providers: [
    ComputerUseService,
    AsyncJobService,
    EnhancedAsyncJobService, // Enhanced async job service with batch processing
    JobEventsGateway, // WebSocket gateway for real-time job events
    JobMonitoringEnhancedService, // Enhanced job monitoring with performance analytics
    BackgroundJobWorkerService, // Enterprise-grade background worker system
    JobManagementService, // Redis-based job persistence and management
    JobResourceCleanupService, // Enterprise resource management and cleanup service
    JobStatusResultService, // Comprehensive job status tracking and result management
    PriorityJobQueueService, // Enterprise-grade thread-safe priority queue management
    JobCancellationTimeoutService, // Advanced job cancellation and timeout handling
  ],
  exports: [
    ComputerUseService,
    AsyncJobService,
    EnhancedAsyncJobService, // Export enhanced async job service
    JobEventsGateway, // Export WebSocket gateway
    JobMonitoringEnhancedService, // Export enhanced job monitoring service
    BackgroundJobWorkerService, // Export background worker service
    JobManagementService, // Export job management service
    JobResourceCleanupService, // Export for use by other modules
    JobStatusResultService, // Export for use by other modules
    PriorityJobQueueService, // Export for use by other modules
    JobCancellationTimeoutService, // Export advanced cancellation capabilities
  ],
})
export class ComputerUseModule {}
