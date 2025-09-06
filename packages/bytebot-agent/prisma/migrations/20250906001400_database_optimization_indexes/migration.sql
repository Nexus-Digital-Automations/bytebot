-- Migration: Database Performance Optimization Indexes
-- Created: 2025-09-06
-- Purpose: Add performance-critical indexes for enterprise workloads

-- Task table performance indexes
-- Index for task status queries (most common query pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_task_status_priority" ON "Task"("status", "priority", "createdAt");

-- Index for task queue ordering (findNextTask optimization)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_task_queue_order" ON "Task"("status", "executedAt", "priority", "queuedAt", "createdAt") 
WHERE "status" IN ('RUNNING', 'PENDING');

-- Index for task scheduling queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_task_scheduled" ON "Task"("scheduledFor", "queuedAt") 
WHERE "scheduledFor" IS NOT NULL AND "queuedAt" IS NULL;

-- Index for task date-based queries and filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_task_dates" ON "Task"("createdAt", "status");

-- Index for task control and execution state
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_task_control_status" ON "Task"("control", "status", "executedAt");

-- Message table performance indexes
-- Index for task-message relationship queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_message_task_created" ON "Message"("taskId", "createdAt");

-- Index for message role filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_message_role_created" ON "Message"("role", "createdAt");

-- Index for summary-message relationship
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_message_summary" ON "Message"("summaryId") 
WHERE "summaryId" IS NOT NULL;

-- Summary table performance indexes
-- Index for task-summary relationship queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_summary_task_created" ON "Summary"("taskId", "createdAt");

-- Index for summary hierarchy queries (self-referential)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_summary_parent" ON "Summary"("parentId") 
WHERE "parentId" IS NOT NULL;

-- Index for summary hierarchy and timestamps
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_summary_hierarchy_dates" ON "Summary"("parentId", "createdAt", "updatedAt");

-- File table performance indexes  
-- Index for task-file relationship queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_file_task_created" ON "File"("taskId", "createdAt");

-- Index for file type and size queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_file_type_size" ON "File"("type", "size");

-- Index for file name searches (case-insensitive)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_file_name_lower" ON "File"(LOWER("name"));

-- Partial indexes for active data (exclude completed/cancelled tasks)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_task_active_priority" ON "Task"("priority", "createdAt", "queuedAt") 
WHERE "status" NOT IN ('COMPLETED', 'CANCELLED', 'FAILED');

-- Composite index for common task filtering patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_task_filter_composite" ON "Task"("status", "type", "priority", "createdAt");

-- Index for task error analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_task_errors" ON "Task"("status", "error", "executedAt") 
WHERE "error" IS NOT NULL;

-- Performance monitoring indexes
-- Index for task completion time analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_task_completion_times" ON "Task"("status", "createdAt", "completedAt") 
WHERE "completedAt" IS NOT NULL;

-- Index for task execution duration analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_task_execution_duration" ON "Task"("status", "executedAt", "completedAt") 
WHERE "executedAt" IS NOT NULL;

-- Add database statistics refresh
-- This helps PostgreSQL optimizer make better query plans
ANALYZE "Task";
ANALYZE "Message"; 
ANALYZE "Summary";
ANALYZE "File";

-- Add comments for maintenance documentation
COMMENT ON INDEX "idx_task_status_priority" IS 'Performance index for task status and priority queries';
COMMENT ON INDEX "idx_task_queue_order" IS 'Optimizes findNextTask query with compound ordering';
COMMENT ON INDEX "idx_task_scheduled" IS 'Optimizes scheduled task queries with partial index';
COMMENT ON INDEX "idx_message_task_created" IS 'Optimizes task-message relationship queries';
COMMENT ON INDEX "idx_summary_hierarchy_dates" IS 'Optimizes summary hierarchy navigation with timestamps';
COMMENT ON INDEX "idx_file_task_created" IS 'Optimizes task-file relationship queries';
COMMENT ON INDEX "idx_task_active_priority" IS 'Partial index for active tasks only';
COMMENT ON INDEX "idx_task_completion_times" IS 'Supports performance analysis queries';