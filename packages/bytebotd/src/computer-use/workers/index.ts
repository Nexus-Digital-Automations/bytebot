/**
 * Background Job Worker System - Public API
 *
 * Exports all public interfaces, types, and services for the
 * enterprise-grade background worker system.
 *
 * @author Claude Code - Background Worker Engine Specialist
 * @version 1.0.0
 */

// Main service export
export { BackgroundJobWorkerService } from './background-job-worker.service';// Type definitionsexport {
  WorkerState,
  WorkerInfo,
  JobExecutionContext,
  WorkerPoolConfig,
  WorkerPoolMetrics,
  WorkerMessageType,
  WorkerMessage,
} from './background-job-worker.service';// Re-export related types from job managementexport {
  JobStatus,
  JobPriority,
} from '../job-management.service';// Re-export shared typesexport type { ComputerAction } from '@bytebot/shared';