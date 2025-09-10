-- CreateEnum for Browser Automation
CREATE TYPE "BrowserTaskStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "BrowserTaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "BrowserSessionStatus" AS ENUM ('ACTIVE', 'IDLE', 'TERMINATED', 'ERROR');

-- CreateTable: Browser Sessions
CREATE TABLE "browser_sessions" (
    "id" TEXT NOT NULL,
    "processId" TEXT,
    "status" "BrowserSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "headless" BOOLEAN NOT NULL DEFAULT true,
    "viewportWidth" INTEGER NOT NULL DEFAULT 1280,
    "viewportHeight" INTEGER NOT NULL DEFAULT 720,
    "userAgent" TEXT,
    "workingDirectory" TEXT,
    "screenshotsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "videoRecording" BOOLEAN NOT NULL DEFAULT false,
    "timeoutMs" INTEGER NOT NULL DEFAULT 300000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "terminatedAt" TIMESTAMP(3),
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "error" TEXT,
    "metadata" JSONB,

    CONSTRAINT "browser_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Browser Tasks
CREATE TABLE "browser_tasks" (
    "id" TEXT NOT NULL,
    "externalTaskId" TEXT,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "BrowserTaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "BrowserTaskPriority" NOT NULL DEFAULT 'NORMAL',
    "startUrl" TEXT,
    "actions" JSONB NOT NULL,
    "configuration" JSONB NOT NULL,
    "constraints" JSONB,
    "validation" JSONB,
    "options" JSONB,
    "retryOptions" JSONB,
    "timeoutSeconds" INTEGER DEFAULT 300,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "customData" JSONB,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "totalSteps" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estimatedRemainingMs" INTEGER,
    "result" JSONB,
    "error" JSONB,
    "userId" TEXT,
    "agentId" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "browser_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Browser Task Steps
CREATE TABLE "browser_task_steps" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "status" "BrowserTaskStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "result" TEXT,
    "error" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "browser_task_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Browser Screenshots
CREATE TABLE "browser_screenshots" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "taskId" TEXT,
    "filename" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "url" TEXT,
    "viewport" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'image/png',
    "metadata" JSONB,

    CONSTRAINT "browser_screenshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Browser DOM Snapshots
CREATE TABLE "browser_dom_snapshots" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "taskId" TEXT,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "htmlContent" TEXT,
    "accessibilityTree" JSONB,
    "interactiveElements" JSONB,
    "extractedText" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileSize" INTEGER,

    CONSTRAINT "browser_dom_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Browser Form Data
CREATE TABLE "browser_form_data" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "formSelector" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "fieldValue" TEXT,
    "isSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "validationResult" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "browser_form_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Browser Data Extractions
CREATE TABLE "browser_data_extractions" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "extractionType" TEXT NOT NULL,
    "selector" TEXT,
    "extractedData" JSONB NOT NULL,
    "rawContent" TEXT,
    "processedContent" JSONB,
    "confidence" DOUBLE PRECISION DEFAULT 1.0,
    "metadata" JSONB,
    "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "browser_data_extractions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "browser_tasks" ADD CONSTRAINT "browser_tasks_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "browser_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "browser_tasks" ADD CONSTRAINT "browser_tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "browser_task_steps" ADD CONSTRAINT "browser_task_steps_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "browser_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "browser_screenshots" ADD CONSTRAINT "browser_screenshots_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "browser_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "browser_screenshots" ADD CONSTRAINT "browser_screenshots_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "browser_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "browser_dom_snapshots" ADD CONSTRAINT "browser_dom_snapshots_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "browser_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "browser_dom_snapshots" ADD CONSTRAINT "browser_dom_snapshots_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "browser_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "browser_form_data" ADD CONSTRAINT "browser_form_data_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "browser_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "browser_data_extractions" ADD CONSTRAINT "browser_data_extractions_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "browser_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "browser_task_steps_taskId_stepNumber_key" ON "browser_task_steps"("taskId", "stepNumber");

-- CreateIndex
CREATE INDEX "browser_sessions_status_idx" ON "browser_sessions"("status");
CREATE INDEX "browser_sessions_createdAt_idx" ON "browser_sessions"("createdAt");
CREATE INDEX "browser_sessions_lastActivity_idx" ON "browser_sessions"("lastActivity");

-- CreateIndex
CREATE INDEX "browser_tasks_status_idx" ON "browser_tasks"("status");
CREATE INDEX "browser_tasks_priority_idx" ON "browser_tasks"("priority");
CREATE INDEX "browser_tasks_sessionId_idx" ON "browser_tasks"("sessionId");
CREATE INDEX "browser_tasks_userId_idx" ON "browser_tasks"("userId");
CREATE INDEX "browser_tasks_createdAt_idx" ON "browser_tasks"("createdAt");
CREATE INDEX "browser_tasks_tags_idx" ON "browser_tasks" USING GIN("tags");

-- CreateIndex
CREATE INDEX "browser_screenshots_sessionId_idx" ON "browser_screenshots"("sessionId");
CREATE INDEX "browser_screenshots_taskId_idx" ON "browser_screenshots"("taskId");
CREATE INDEX "browser_screenshots_timestamp_idx" ON "browser_screenshots"("timestamp");

-- CreateIndex
CREATE INDEX "browser_dom_snapshots_sessionId_idx" ON "browser_dom_snapshots"("sessionId");
CREATE INDEX "browser_dom_snapshots_taskId_idx" ON "browser_dom_snapshots"("taskId");
CREATE INDEX "browser_dom_snapshots_timestamp_idx" ON "browser_dom_snapshots"("timestamp");
CREATE INDEX "browser_dom_snapshots_url_idx" ON "browser_dom_snapshots"("url");

-- CreateIndex
CREATE INDEX "browser_form_data_taskId_idx" ON "browser_form_data"("taskId");
CREATE INDEX "browser_form_data_formSelector_idx" ON "browser_form_data"("formSelector");

-- CreateIndex
CREATE INDEX "browser_data_extractions_taskId_idx" ON "browser_data_extractions"("taskId");
CREATE INDEX "browser_data_extractions_extractionType_idx" ON "browser_data_extractions"("extractionType");
CREATE INDEX "browser_data_extractions_extractedAt_idx" ON "browser_data_extractions"("extractedAt");

-- Create views for analytics and monitoring
CREATE OR REPLACE VIEW browser_session_analytics AS
SELECT 
    date_trunc('hour', "createdAt") as hour,
    status,
    COUNT(*) as session_count,
    AVG(EXTRACT(EPOCH FROM (COALESCE("terminatedAt", "updatedAt") - "createdAt"))) as avg_duration_seconds,
    SUM(CASE WHEN "screenshotsEnabled" THEN 1 ELSE 0 END) as screenshots_enabled_count
FROM "browser_sessions"
GROUP BY hour, status
ORDER BY hour DESC;

CREATE OR REPLACE VIEW browser_task_analytics AS
SELECT 
    date_trunc('hour', "createdAt") as hour,
    type,
    status,
    priority,
    COUNT(*) as task_count,
    AVG("currentStep"::float / GREATEST("totalSteps", 1)) as avg_completion_rate,
    AVG(EXTRACT(EPOCH FROM (COALESCE("completedAt", "updatedAt") - "createdAt"))) as avg_execution_seconds,
    SUM("retryCount") as total_retries
FROM "browser_tasks"
GROUP BY hour, type, status, priority
ORDER BY hour DESC;

-- Create function for session cleanup
CREATE OR REPLACE FUNCTION cleanup_expired_browser_sessions()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    -- Update expired sessions to TERMINATED status
    WITH expired_sessions AS (
        UPDATE "browser_sessions"
        SET 
            status = 'TERMINATED',
            "terminatedAt" = CURRENT_TIMESTAMP,
            error = 'Session expired due to inactivity'
        WHERE 
            status IN ('ACTIVE', 'IDLE')
            AND "lastActivity" < CURRENT_TIMESTAMP - INTERVAL '1 hour'
        RETURNING id
    )
    SELECT COUNT(*) INTO expired_count FROM expired_sessions;
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Create function for task timeout handling
CREATE OR REPLACE FUNCTION handle_browser_task_timeouts()
RETURNS INTEGER AS $$
DECLARE
    timeout_count INTEGER;
BEGIN
    -- Cancel tasks that have exceeded their timeout
    WITH timeout_tasks AS (
        UPDATE "browser_tasks"
        SET 
            status = 'FAILED',
            "completedAt" = CURRENT_TIMESTAMP,
            error = jsonb_build_object(
                'code', 'TASK_TIMEOUT',
                'message', 'Task exceeded maximum execution time',
                'timestamp', CURRENT_TIMESTAMP
            )
        WHERE 
            status IN ('PENDING', 'RUNNING')
            AND "createdAt" < CURRENT_TIMESTAMP - INTERVAL '1 second' * COALESCE("timeoutSeconds", 300)
        RETURNING id
    )
    SELECT COUNT(*) INTO timeout_count FROM timeout_tasks;
    
    RETURN timeout_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE "browser_sessions" IS 'Browser automation sessions with lifecycle management';
COMMENT ON TABLE "browser_tasks" IS 'Browser automation tasks with execution tracking';
COMMENT ON TABLE "browser_task_steps" IS 'Individual steps within browser tasks';
COMMENT ON TABLE "browser_screenshots" IS 'Screenshots captured during browser automation';
COMMENT ON TABLE "browser_dom_snapshots" IS 'DOM snapshots and extracted content';
COMMENT ON TABLE "browser_form_data" IS 'Form interactions and data extraction';
COMMENT ON TABLE "browser_data_extractions" IS 'Structured data extracted from web pages';

COMMENT ON FUNCTION cleanup_expired_browser_sessions() IS 'Cleanup function for expired browser sessions';
COMMENT ON FUNCTION handle_browser_task_timeouts() IS 'Timeout handler for long-running browser tasks';