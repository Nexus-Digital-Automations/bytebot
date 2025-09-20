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
export { BackgroundJobWorkerService } from './background-job-worker.service';

// Type definitions
export {
  WorkerState,
  WorkerInfo,
  JobExecutionContext,
  WorkerPoolConfig,
  WorkerPoolMetrics,
  WorkerMessageType,
  WorkerMessage,
} from './background-job-worker.service';

// Re-export related types from job management
export {
  JobStatus,
  JobPriority,
} from '../job-management.service';

// Re-export shared types
export type { ComputerAction } from '@bytebot/shared';