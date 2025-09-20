/**
 * Background Worker Process - Isolated Job Execution Environment
 *
 * Runs as a separate Node.js process to execute computer-use jobs in isolation.
 * Provides proper resource management, error handling, and IPC communication.
 *
 * Features:
 * - Isolated execution environment
 * - Resource monitoring and reporting
 * - Graceful shutdown handling
 * - Heartbeat and health monitoring
 * - Error isolation and recovery
 * - Performance optimization
 *
 * @author Claude Code - Background Worker Engine Specialist
 * @version 1.0.0
 */

const { parentPort } = require('worker_threads');
const os = require('os');
const v8 = require('v8');

// ===== WORKER PROCESS CONFIGURATION =====

const WORKER_ID = process.env.WORKER_ID || 'unknown';
const WORKER_TIMEOUT_MS = parseInt(process.env.WORKER_TIMEOUT_MS) || 300000;
const HEARTBEAT_INTERVAL_MS = 5000; // 5 seconds
const MEMORY_CHECK_INTERVAL_MS = 30000; // 30 seconds
const MAX_MEMORY_USAGE_MB = 512; // Maximum memory usage before restart

// ===== WORKER STATE MANAGEMENT =====

let isShuttingDown = false;
let currentJob = null;
let currentJobTimeout = null;
let heartbeatInterval = null;
let memoryCheckInterval = null;

// Performance tracking
const performanceMetrics = {
  jobsCompleted: 0,
  jobsFailed: 0,
  totalExecutionTime: 0,
  averageExecutionTime: 0,
  startTime: Date.now(),
};

// ===== MESSAGE TYPES =====

const WorkerMessageType = {
  EXECUTE_JOB: 'execute_job',
  JOB_PROGRESS: 'job_progress',
  JOB_COMPLETED: 'job_completed',
  JOB_FAILED: 'job_failed',
  HEARTBEAT: 'heartbeat',
  SHUTDOWN: 'shutdown',
  WORKER_READY: 'worker_ready',
  HEALTH_CHECK: 'health_check',
};

// ===== LOGGING UTILITY =====

function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    workerId: WORKER_ID,
    level,
    message,
    ...data,
  };

  console.log(`[${timestamp}] [${level.toUpperCase()}] [Worker:${WORKER_ID}] ${message}`,
    Object.keys(data).length > 0 ? JSON.stringify(data, null, 2) : '');
}

// ===== IPC COMMUNICATION =====

/**
 * Send message to parent process
 */
function sendMessage(type, data = null, jobId = null) {
  if (isShuttingDown && type !== WorkerMessageType.SHUTDOWN) {
    return;
  }

  try {
    const message = {
      type,
      workerId: WORKER_ID,
      jobId,
      data,
      timestamp: new Date(),
    };

    process.send(message);
  } catch (error) {
    log('error', 'Failed to send message to parent', {
      type,
      error: error.message,
    });
  }
}

/**
 * Handle messages from parent process
 */
function handleParentMessage(message) {
  try {
    log('debug', 'Received message from parent', { type: message.type });

    switch (message.type) {
      case WorkerMessageType.EXECUTE_JOB:
        handleJobExecution(message.data);
        break;

      case WorkerMessageType.SHUTDOWN:
        handleShutdown();
        break;

      case WorkerMessageType.HEALTH_CHECK:
        sendHealthCheck();
        break;

      default:
        log('warn', 'Unknown message type from parent', { message });
    }
  } catch (error) {
    log('error', 'Error handling parent message', {
      error: error.message,
      message,
    });
  }
}

// ===== JOB EXECUTION =====

/**
 * Handle job execution request
 */
async function handleJobExecution(jobContext) {
  if (currentJob) {
    log('warn', 'Worker already executing a job', {
      currentJobId: currentJob.jobId,
      newJobId: jobContext.jobId,
    });
    sendMessage(WorkerMessageType.JOB_FAILED, 'Worker busy with another job', jobContext.jobId);
    return;
  }

  currentJob = jobContext;
  const startTime = Date.now();

  log('info', 'Starting job execution', {
    jobId: jobContext.jobId,
    action: jobContext.action.action,
    priority: jobContext.priority,
    timeout: jobContext.timeout,
  });

  // Set job timeout
  currentJobTimeout = setTimeout(() => {
    handleJobTimeout();
  }, jobContext.timeout);

  try {
    // Simulate dynamic loading of ComputerUseService
    // In a real implementation, you would require and instantiate the service here
    const result = await executeComputerAction(jobContext.action);

    // Clear timeout
    if (currentJobTimeout) {
      clearTimeout(currentJobTimeout);
      currentJobTimeout = null;
    }

    const executionTime = Date.now() - startTime;
    updatePerformanceMetrics(executionTime, true);

    log('info', 'Job completed successfully', {
      jobId: jobContext.jobId,
      executionTime,
      resultSize: JSON.stringify(result).length,
    });

    sendMessage(WorkerMessageType.JOB_COMPLETED, result, jobContext.jobId);

  } catch (error) {
    // Clear timeout
    if (currentJobTimeout) {
      clearTimeout(currentJobTimeout);
      currentJobTimeout = null;
    }

    const executionTime = Date.now() - startTime;
    updatePerformanceMetrics(executionTime, false);

    log('error', 'Job execution failed', {
      jobId: jobContext.jobId,
      error: error.message,
      stack: error.stack,
      executionTime,
    });

    sendMessage(WorkerMessageType.JOB_FAILED, error.message, jobContext.jobId);

  } finally {
    currentJob = null;
  }
}

/**
 * Handle job timeout
 */
function handleJobTimeout() {
  if (!currentJob) return;

  log('warn', 'Job execution timed out', {
    jobId: currentJob.jobId,
    timeout: currentJob.timeout,
  });

  updatePerformanceMetrics(currentJob.timeout, false);
  sendMessage(WorkerMessageType.JOB_FAILED, 'Job execution timed out', currentJob.jobId);

  currentJob = null;
  currentJobTimeout = null;
}

/**
 * Execute computer action (mock implementation for now)
 * In production, this would interface with the actual ComputerUseService
 */
async function executeComputerAction(action) {
  // Simulate execution time based on action type
  const executionTimes = {
    screenshot: 1000,
    move_mouse: 100,
    click_mouse: 200,
    type_text: 300,
    press_keys: 150,
    scroll: 250,
    read_file: 500,
    write_file: 800,
  };

  const baseTime = executionTimes[action.action] || 500;
  const randomVariation = Math.random() * 0.5 + 0.75; // 75-125% of base time
  const simulatedTime = Math.floor(baseTime * randomVariation);

  // Simulate progress updates for long-running tasks
  if (simulatedTime > 1000) {
    const progressSteps = Math.floor(simulatedTime / 500);
    for (let i = 1; i <= progressSteps; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));

      if (isShuttingDown || !currentJob) break;

      const progress = Math.min(90, (i / progressSteps) * 100);
      sendMessage(WorkerMessageType.JOB_PROGRESS, { progress }, currentJob.jobId);
    }
  } else {
    await new Promise(resolve => setTimeout(resolve, simulatedTime));
  }

  // Simulate different response types based on action
  switch (action.action) {
    case 'screenshot':
      return {
        image: 'base64-mock-screenshot-data',
        metadata: {
          width: 1920,
          height: 1080,
          format: 'png',
          captureTime: new Date(),
          operationId: `op_${Date.now()}`,
          fileSize: 245760,
          quality: 100,
        },
      };

    case 'move_mouse':
    case 'click_mouse':
      return {
        x: action.x || 0,
        y: action.y || 0,
        timestamp: new Date(),
        operationId: `op_${Date.now()}`,
      };

    case 'type_text':
    case 'type_keys':
    case 'press_keys':
      return {
        success: true,
        message: `Successfully executed ${action.action}`,
        operationId: `op_${Date.now()}`,
        timestamp: new Date(),
      };

    case 'read_file':
      return {
        success: true,
        data: 'mock-file-content',
        name: action.path?.split('/').pop() || 'unknown',
        size: 1024,
        mediaType: 'text/plain',
        lastModified: new Date(),
        operationId: `op_${Date.now()}`,
        timestamp: new Date(),
      };

    case 'write_file':
      return {
        success: true,
        message: 'File written successfully',
        path: action.path,
        size: action.content?.length || 0,
        operationId: `op_${Date.now()}`,
        timestamp: new Date(),
      };

    default:
      return {
        success: true,
        message: `Mock execution of ${action.action}`,
        operationId: `op_${Date.now()}`,
        timestamp: new Date(),
      };
  }
}

// ===== PERFORMANCE MONITORING =====

/**
 * Update performance metrics
 */
function updatePerformanceMetrics(executionTime, success) {
  if (success) {
    performanceMetrics.jobsCompleted++;
  } else {
    performanceMetrics.jobsFailed++;
  }

  performanceMetrics.totalExecutionTime += executionTime;
  const totalJobs = performanceMetrics.jobsCompleted + performanceMetrics.jobsFailed;

  if (totalJobs > 0) {
    performanceMetrics.averageExecutionTime = performanceMetrics.totalExecutionTime / totalJobs;
  }
}

/**
 * Get current resource usage
 */
function getResourceUsage() {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  return {
    memoryUsage: {
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
    },
    cpuUsage: {
      user: cpuUsage.user,
      system: cpuUsage.system,
    },
    v8HeapStats: v8.getHeapStatistics(),
    uptime: process.uptime(),
  };
}

/**
 * Send heartbeat with resource usage
 */
function sendHeartbeat() {
  if (isShuttingDown) return;

  const resourceUsage = getResourceUsage();

  sendMessage(WorkerMessageType.HEARTBEAT, {
    ...resourceUsage,
    performance: performanceMetrics,
    currentJob: currentJob ? {
      jobId: currentJob.jobId,
      startTime: currentJob.assignedAt,
      action: currentJob.action.action,
    } : null,
  });
}

/**
 * Send health check response
 */
function sendHealthCheck() {
  const resourceUsage = getResourceUsage();
  const memoryUsageMB = resourceUsage.memoryUsage.rss / (1024 * 1024);

  const healthStatus = {
    healthy: memoryUsageMB < MAX_MEMORY_USAGE_MB && !isShuttingDown,
    memoryUsageMB,
    maxMemoryMB: MAX_MEMORY_USAGE_MB,
    uptime: process.uptime(),
    performance: performanceMetrics,
    currentJob: currentJob ? currentJob.jobId : null,
  };

  sendMessage(WorkerMessageType.HEALTH_CHECK, healthStatus);
}

// ===== MEMORY MONITORING =====

/**
 * Check memory usage and trigger GC if needed
 */
function checkMemoryUsage() {
  const memUsage = process.memoryUsage();
  const memoryUsageMB = memUsage.rss / (1024 * 1024);

  if (memoryUsageMB > MAX_MEMORY_USAGE_MB * 0.8) {
    log('warn', 'High memory usage detected, triggering garbage collection', {
      memoryUsageMB,
      maxMemoryMB: MAX_MEMORY_USAGE_MB,
    });

    // Trigger garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Re-check after GC
    const newMemUsage = process.memoryUsage();
    const newMemoryUsageMB = newMemUsage.rss / (1024 * 1024);

    log('info', 'Garbage collection completed', {
      beforeMB: memoryUsageMB,
      afterMB: newMemoryUsageMB,
      freedMB: memoryUsageMB - newMemoryUsageMB,
    });

    // If still too high after GC, recommend restart
    if (newMemoryUsageMB > MAX_MEMORY_USAGE_MB * 0.9) {
      log('error', 'Memory usage still high after GC, worker should be restarted', {
        memoryUsageMB: newMemoryUsageMB,
        maxMemoryMB: MAX_MEMORY_USAGE_MB,
      });
    }
  }
}

// ===== SHUTDOWN HANDLING =====

/**
 * Handle graceful shutdown
 */
function handleShutdown() {
  if (isShuttingDown) {
    log('warn', 'Shutdown already in progress');
    return;
  }

  isShuttingDown = true;
  log('info', 'Starting graceful shutdown...');

  // Clear intervals
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  if (memoryCheckInterval) {
    clearInterval(memoryCheckInterval);
    memoryCheckInterval = null;
  }

  // If there's a current job, wait for it to complete or timeout
  if (currentJob) {
    log('info', 'Waiting for current job to complete before shutdown', {
      jobId: currentJob.jobId,
    });

    const shutdownTimeout = setTimeout(() => {
      log('warn', 'Shutdown timeout, forcing exit');
      process.exit(1);
    }, 30000); // 30 second timeout

    // Wait for job to complete
    const checkJobCompletion = setInterval(() => {
      if (!currentJob) {
        clearTimeout(shutdownTimeout);
        clearInterval(checkJobCompletion);
        completeShutdown();
      }
    }, 1000);
  } else {
    completeShutdown();
  }
}

/**
 * Complete shutdown process
 */
function completeShutdown() {
  log('info', 'Worker shutdown complete', {
    uptime: process.uptime(),
    performance: performanceMetrics,
  });

  // Send final status before exit
  sendMessage(WorkerMessageType.SHUTDOWN, {
    reason: 'graceful_shutdown',
    performance: performanceMetrics,
    uptime: process.uptime(),
  });

  // Exit gracefully
  setTimeout(() => {
    process.exit(0);
  }, 100);
}

// ===== ERROR HANDLING =====

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error) => {
  log('error', 'Uncaught exception in worker process', {
    error: error.message,
    stack: error.stack,
  });

  // If we have a current job, mark it as failed
  if (currentJob) {
    sendMessage(WorkerMessageType.JOB_FAILED,
      `Worker crashed: ${error.message}`,
      currentJob.jobId);
  }

  // Exit with error code
  process.exit(1);
});

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
  log('error', 'Unhandled promise rejection in worker process', {
    reason: reason?.toString(),
    promise: promise?.toString(),
  });

  // If we have a current job, mark it as failed
  if (currentJob) {
    sendMessage(WorkerMessageType.JOB_FAILED,
      `Worker promise rejection: ${reason}`,
      currentJob.jobId);
  }

  // Exit with error code
  process.exit(1);
});

/**
 * Handle process termination signals
 */
process.on('SIGTERM', () => {
  log('info', 'Received SIGTERM, initiating graceful shutdown');
  handleShutdown();
});

process.on('SIGINT', () => {
  log('info', 'Received SIGINT, initiating graceful shutdown');
  handleShutdown();
});

// ===== WORKER INITIALIZATION =====

/**
 * Initialize worker process
 */
function initializeWorker() {
  log('info', 'Initializing background worker process', {
    workerId: WORKER_ID,
    pid: process.pid,
    nodeVersion: process.version,
    platform: os.platform(),
    arch: os.arch(),
    memory: os.totalmem(),
  });

  // Setup message handling
  process.on('message', handleParentMessage);

  // Start heartbeat
  heartbeatInterval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

  // Start memory monitoring
  memoryCheckInterval = setInterval(checkMemoryUsage, MEMORY_CHECK_INTERVAL_MS);

  // Signal that worker is ready
  sendMessage(WorkerMessageType.WORKER_READY, {
    workerId: WORKER_ID,
    pid: process.pid,
    startTime: new Date(),
    resourceUsage: getResourceUsage(),
  });

  log('info', 'Background worker process initialized and ready');
}

// ===== START WORKER =====

// Start the worker process
initializeWorker();

log('info', 'Background worker process started', {
  workerId: WORKER_ID,
  pid: process.pid,
});