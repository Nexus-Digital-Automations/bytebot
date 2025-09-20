/**
 * Worker Process Integration Tests
 *
 * Tests the isolated worker process functionality including job execution,
 * resource monitoring, error handling, and IPC communication.
 *
 * @author Claude Code - Background Worker Engine Specialist
 * @version 1.0.0
 */

import { fork, ChildProcess } from 'child_process';import * as path from 'path';import { EventEmitter } from 'events';// Message types for worker communicationconst WorkerMessageType = {
  EXECUTE_JOB: 'execute_job',JOB_PROGRESS: 'job_progress',JOB_COMPLETED: 'job_completed',JOB_FAILED: 'job_failed',HEARTBEAT: 'heartbeat',SHUTDOWN: 'shutdown',WORKER_READY: 'worker_ready',HEALTH_CHECK: 'health_check',};describe('Worker Process Integration Tests', () => {let workerProcess: ChildProcess;let workerMessages: any[] = [];

  const createWorkerProcess = (): Promise<ChildProcess> => {
    return new Promise((resolve, reject) => {
      const workerScriptPath = path.join(__dirname, 'worker-process.js');const worker = fork(workerScriptPath, [], {silent: false,
        env: {
          ...process.env,
          WORKER_ID: 'test-worker-' + Date.now(),WORKER_TIMEOUT_MS: '30000',NODE_ENV: 'test',},execArgv: [
          '--max-old-space-size=512','--expose-gc',],});

      // Collect messages
      worker.on('message', (message) => {workerMessages.push(message);});

      // Handle worker ready
      worker.once('message', (message) => {if (message.type === WorkerMessageType.WORKER_READY) {resolve(worker);
        }
      });

      // Handle errors
      worker.on('error', reject);// Timeout if worker doesn't startsetTimeout(() => {
        reject(new Error('Worker failed to start within 10 seconds'));}, 10000);});
  };

  beforeEach(async () => {
    workerMessages = [];
  });

  afterEach(async () => {
    if (workerProcess && !workerProcess.killed) {
      workerProcess.kill('SIGTERM');await new Promise((resolve) => {workerProcess.once('exit', resolve);});}
  });

  describe('Worker Initialization', () => {it('should start worker process and send ready message', async () => {workerProcess = await createWorkerProcess();expect(workerProcess).toBeDefined();
      expect(workerProcess.pid).toBeGreaterThan(0);

      const readyMessage = workerMessages.find(m => m.type === WorkerMessageType.WORKER_READY);
      expect(readyMessage).toBeDefined();
      expect(readyMessage.data).toMatchObject({
        workerId: expect.any(String),
        pid: expect.any(Number),
        startTime: expect.any(String),
        resourceUsage: expect.any(Object),
      });
    }, 15000);

    it('should start sending heartbeat messages', async () => {workerProcess = await createWorkerProcess();// Wait for heartbeat messages
      await new Promise(resolve => setTimeout(resolve, 6000));

      const heartbeatMessages = workerMessages.filter(m => m.type === WorkerMessageType.HEARTBEAT);
      expect(heartbeatMessages.length).toBeGreaterThan(0);

      const latestHeartbeat = heartbeatMessages[heartbeatMessages.length - 1];
      expect(latestHeartbeat.data).toMatchObject({
        memoryUsage: expect.objectContaining({
          rss: expect.any(Number),
          heapUsed: expect.any(Number),
          heapTotal: expect.any(Number),
          external: expect.any(Number),
        }),
        cpuUsage: expect.objectContaining({
          user: expect.any(Number),
          system: expect.any(Number),
        }),
        performance: expect.objectContaining({
          jobsCompleted: expect.any(Number),
          jobsFailed: expect.any(Number),
        }),
      });
    }, 15000);
  });

  describe('Job Execution', () => {beforeEach(async () => {workerProcess = await createWorkerProcess();
    });

    it('should execute screenshot job successfully', async () => {const jobId = 'test-job-' + Date.now();const jobContext = {jobId,
        action: { action: 'screenshot' },priority: 'normal',timeout: 30000,metadata: { test: true },
        submittedAt: new Date(),
        assignedAt: new Date(),
      };

      // Send job execution message
      workerProcess.send({
        type: WorkerMessageType.EXECUTE_JOB,
        workerId: 'test-worker',jobId,data: jobContext,
        timestamp: new Date(),
      });

      // Wait for job completion
      await new Promise((resolve) => {
        const checkCompletion = () => {
          const completionMessage = workerMessages.find(m =>
            m.type === WorkerMessageType.JOB_COMPLETED && m.jobId === jobId
          );

          if (completionMessage) {
            resolve(completionMessage);
          } else {
            setTimeout(checkCompletion, 100);
          }
        };
        checkCompletion();
      });

      const completionMessage = workerMessages.find(m =>
        m.type === WorkerMessageType.JOB_COMPLETED && m.jobId === jobId
      );

      expect(completionMessage).toBeDefined();
      expect(completionMessage.data).toMatchObject({
        image: expect.any(String),
        metadata: expect.objectContaining({
          width: expect.any(Number),
          height: expect.any(Number),
          format: expect.any(String),
        }),
      });
    }, 15000);

    it('should execute mouse action job successfully', async () => {const jobId = 'test-mouse-job-' + Date.now();const jobContext = {jobId,
        action: { action: 'click_mouse', x: 100, y: 200 },priority: 'normal',timeout: 30000,submittedAt: new Date(),
        assignedAt: new Date(),
      };

      workerProcess.send({
        type: WorkerMessageType.EXECUTE_JOB,
        workerId: 'test-worker',jobId,data: jobContext,
        timestamp: new Date(),
      });

      // Wait for job completion
      await new Promise((resolve) => {
        const checkCompletion = () => {
          const completionMessage = workerMessages.find(m =>
            m.type === WorkerMessageType.JOB_COMPLETED && m.jobId === jobId
          );

          if (completionMessage) {
            resolve(completionMessage);
          } else {
            setTimeout(checkCompletion, 100);
          }
        };
        checkCompletion();
      });

      const completionMessage = workerMessages.find(m =>
        m.type === WorkerMessageType.JOB_COMPLETED && m.jobId === jobId
      );

      expect(completionMessage).toBeDefined();
      expect(completionMessage.data).toMatchObject({
        x: expect.any(Number),
        y: expect.any(Number),
        timestamp: expect.any(String),
        operationId: expect.any(String),
      });
    }, 15000);

    it('should handle file operation jobs', async () => {const jobId = 'test-file-job-' + Date.now();const jobContext = {jobId,
        action: { action: 'write_file', path: '/tmp/test.txt', content: 'test content' },priority: 'normal',timeout: 30000,submittedAt: new Date(),
        assignedAt: new Date(),
      };

      workerProcess.send({
        type: WorkerMessageType.EXECUTE_JOB,
        workerId: 'test-worker',jobId,data: jobContext,
        timestamp: new Date(),
      });

      // Wait for job completion
      await new Promise((resolve) => {
        const checkCompletion = () => {
          const completionMessage = workerMessages.find(m =>
            m.type === WorkerMessageType.JOB_COMPLETED && m.jobId === jobId
          );

          if (completionMessage) {
            resolve(completionMessage);
          } else {
            setTimeout(checkCompletion, 100);
          }
        };
        checkCompletion();
      });

      const completionMessage = workerMessages.find(m =>
        m.type === WorkerMessageType.JOB_COMPLETED && m.jobId === jobId
      );

      expect(completionMessage).toBeDefined();
      expect(completionMessage.data).toMatchObject({
        success: true,
        message: expect.any(String),
        path: '/tmp/test.txt',size: expect.any(Number),operationId: expect.any(String),
      });
    }, 15000);

    it('should send progress updates for long-running jobs', async () => {const jobId = 'test-long-job-' + Date.now();const jobContext = {jobId,
        action: { action: 'write_file', path: '/tmp/large_file.txt', content: 'x'.repeat(10000) },priority: 'normal',timeout: 30000,submittedAt: new Date(),
        assignedAt: new Date(),
      };

      workerProcess.send({
        type: WorkerMessageType.EXECUTE_JOB,
        workerId: 'test-worker',jobId,data: jobContext,
        timestamp: new Date(),
      });

      // Wait for progress and completion messages
      await new Promise((resolve) => {
        const checkCompletion = () => {
          const completionMessage = workerMessages.find(m =>
            m.type === WorkerMessageType.JOB_COMPLETED && m.jobId === jobId
          );

          if (completionMessage) {
            resolve(completionMessage);
          } else {
            setTimeout(checkCompletion, 100);
          }
        };
        checkCompletion();
      });

      const progressMessages = workerMessages.filter(m =>
        m.type === WorkerMessageType.JOB_PROGRESS && m.jobId === jobId
      );

      // Should have received at least one progress update
      expect(progressMessages.length).toBeGreaterThan(0);
      progressMessages.forEach(message => {
        expect(message.data).toMatchObject({
          progress: expect.any(Number),
        });
        expect(message.data.progress).toBeGreaterThanOrEqual(0);
        expect(message.data.progress).toBeLessThanOrEqual(100);
      });
    }, 15000);

    it('should handle job timeouts', async () => {const jobId = 'test-timeout-job-' + Date.now();const jobContext = {jobId,
        action: { action: 'screenshot' },priority: 'normal',timeout: 100, // Very short timeoutsubmittedAt: new Date(),
        assignedAt: new Date(),
      };

      workerProcess.send({
        type: WorkerMessageType.EXECUTE_JOB,
        workerId: 'test-worker',jobId,data: jobContext,
        timestamp: new Date(),
      });

      // Wait for timeout failure
      await new Promise((resolve) => {
        const checkFailure = () => {
          const failureMessage = workerMessages.find(m =>
            m.type === WorkerMessageType.JOB_FAILED && m.jobId === jobId
          );

          if (failureMessage) {
            resolve(failureMessage);
          } else {
            setTimeout(checkFailure, 50);
          }
        };
        checkFailure();
      });

      const failureMessage = workerMessages.find(m =>
        m.type === WorkerMessageType.JOB_FAILED && m.jobId === jobId
      );

      expect(failureMessage).toBeDefined();
      expect(failureMessage.data).toBe('Job execution timed out');}, 15000);it('should reject multiple concurrent jobs', async () => {const jobId1 = 'test-job-1-' + Date.now();const jobId2 = 'test-job-2-' + Date.now();const jobContext1 = {jobId: jobId1,
        action: { action: 'screenshot' },priority: 'normal',timeout: 30000,submittedAt: new Date(),
        assignedAt: new Date(),
      };

      const jobContext2 = {
        jobId: jobId2,
        action: { action: 'click_mouse', x: 100, y: 200 },priority: 'normal',timeout: 30000,submittedAt: new Date(),
        assignedAt: new Date(),
      };

      // Send first job
      workerProcess.send({
        type: WorkerMessageType.EXECUTE_JOB,
        workerId: 'test-worker',jobId: jobId1,data: jobContext1,
        timestamp: new Date(),
      });

      // Immediately send second job
      workerProcess.send({
        type: WorkerMessageType.EXECUTE_JOB,
        workerId: 'test-worker',jobId: jobId2,data: jobContext2,
        timestamp: new Date(),
      });

      // Wait for second job to be rejected
      await new Promise((resolve) => {
        const checkRejection = () => {
          const rejectionMessage = workerMessages.find(m =>
            m.type === WorkerMessageType.JOB_FAILED &&
            m.jobId === jobId2 &&
            m.data.includes('Worker busy'));if (rejectionMessage) {
            resolve(rejectionMessage);
          } else {
            setTimeout(checkRejection, 100);
          }
        };
        checkRejection();
      });

      const rejectionMessage = workerMessages.find(m =>
        m.type === WorkerMessageType.JOB_FAILED &&
        m.jobId === jobId2
      );

      expect(rejectionMessage).toBeDefined();
      expect(rejectionMessage.data).toContain('Worker busy with another job');}, 15000);});

  describe('Resource Monitoring', () => {beforeEach(async () => {workerProcess = await createWorkerProcess();
    });

    it('should monitor memory usage', async () => {// Wait for a few heartbeatsawait new Promise(resolve => setTimeout(resolve, 6000));

      const heartbeatMessages = workerMessages.filter(m => m.type === WorkerMessageType.HEARTBEAT);
      expect(heartbeatMessages.length).toBeGreaterThan(0);

      const latestHeartbeat = heartbeatMessages[heartbeatMessages.length - 1];
      const memoryUsage = latestHeartbeat.data.memoryUsage;

      expect(memoryUsage.rss).toBeGreaterThan(0);
      expect(memoryUsage.heapUsed).toBeGreaterThan(0);
      expect(memoryUsage.heapTotal).toBeGreaterThan(0);
      expect(memoryUsage.external).toBeGreaterThanOrEqual(0);

      // Memory usage should be reasonable (less than 512MB)
      expect(memoryUsage.rss).toBeLessThan(512 * 1024 * 1024);
    }, 15000);

    it('should monitor CPU usage', async () => {// Execute a job to generate some CPU usageconst jobId = 'cpu-test-job-' + Date.now();const jobContext = {jobId,
        action: { action: 'screenshot' },priority: 'normal',timeout: 30000,submittedAt: new Date(),
        assignedAt: new Date(),
      };

      workerProcess.send({
        type: WorkerMessageType.EXECUTE_JOB,
        workerId: 'test-worker',jobId,data: jobContext,
        timestamp: new Date(),
      });

      // Wait for job completion and more heartbeats
      await new Promise(resolve => setTimeout(resolve, 8000));

      const heartbeatMessages = workerMessages.filter(m => m.type === WorkerMessageType.HEARTBEAT);
      const latestHeartbeat = heartbeatMessages[heartbeatMessages.length - 1];
      const cpuUsage = latestHeartbeat.data.cpuUsage;

      expect(cpuUsage.user).toBeGreaterThanOrEqual(0);
      expect(cpuUsage.system).toBeGreaterThanOrEqual(0);
    }, 15000);

    it('should respond to health check requests', async () => {// Send health check requestworkerProcess.send({
        type: WorkerMessageType.HEALTH_CHECK,
        workerId: 'test-worker',timestamp: new Date(),});

      // Wait for health check response
      await new Promise((resolve) => {
        const checkResponse = () => {
          const healthMessage = workerMessages.find(m => m.type === WorkerMessageType.HEALTH_CHECK);

          if (healthMessage) {
            resolve(healthMessage);
          } else {
            setTimeout(checkResponse, 100);
          }
        };
        checkResponse();
      });

      const healthMessage = workerMessages.find(m => m.type === WorkerMessageType.HEALTH_CHECK);
      expect(healthMessage).toBeDefined();
      expect(healthMessage.data).toMatchObject({
        healthy: expect.any(Boolean),
        memoryUsageMB: expect.any(Number),
        maxMemoryMB: expect.any(Number),
        uptime: expect.any(Number),
        performance: expect.any(Object),
      });
    }, 15000);
  });

  describe('Error Handling', () => {beforeEach(async () => {workerProcess = await createWorkerProcess();
    });

    it('should handle invalid messages gracefully', async () => {// Send invalid messageworkerProcess.send({
        type: 'invalid_message_type',data: 'invalid data',});// Worker should continue to send heartbeats
      await new Promise(resolve => setTimeout(resolve, 6000));

      const heartbeatMessages = workerMessages.filter(m => m.type === WorkerMessageType.HEARTBEAT);
      expect(heartbeatMessages.length).toBeGreaterThan(0);
    }, 15000);

    it('should handle malformed job data', async () => {const jobId = 'malformed-job-' + Date.now();// Send job with malformed dataworkerProcess.send({
        type: WorkerMessageType.EXECUTE_JOB,
        workerId: 'test-worker',jobId,data: null, // Invalid job context
        timestamp: new Date(),
      });

      // Wait for error response
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Worker should still be responsive
      const heartbeatMessages = workerMessages.filter(m => m.type === WorkerMessageType.HEARTBEAT);
      expect(heartbeatMessages.length).toBeGreaterThan(0);
    }, 15000);
  });

  describe('Graceful Shutdown', () => {beforeEach(async () => {workerProcess = await createWorkerProcess();
    });

    it('should handle graceful shutdown request', async () => {// Send shutdown requestworkerProcess.send({
        type: WorkerMessageType.SHUTDOWN,
        workerId: 'test-worker',timestamp: new Date(),});

      // Wait for shutdown message and process exit
      await new Promise((resolve) => {
        workerProcess.once('exit', resolve);});const shutdownMessage = workerMessages.find(m => m.type === WorkerMessageType.SHUTDOWN);
      expect(shutdownMessage).toBeDefined();
      expect(shutdownMessage.data).toMatchObject({
        reason: 'graceful_shutdown',performance: expect.any(Object),uptime: expect.any(Number),
      });
    }, 15000);

    it('should complete current job before shutdown', async () => {const jobId = 'shutdown-job-' + Date.now();const jobContext = {jobId,
        action: { action: 'write_file', path: '/tmp/shutdown_test.txt', content: 'test' },priority: 'normal',timeout: 30000,submittedAt: new Date(),
        assignedAt: new Date(),
      };

      // Start a job
      workerProcess.send({
        type: WorkerMessageType.EXECUTE_JOB,
        workerId: 'test-worker',jobId,data: jobContext,
        timestamp: new Date(),
      });

      // Immediately request shutdown
      workerProcess.send({
        type: WorkerMessageType.SHUTDOWN,
        workerId: 'test-worker',timestamp: new Date(),});

      // Wait for job completion and then shutdown
      await new Promise((resolve) => {
        workerProcess.once('exit', resolve);
      });

      // Job should complete before shutdown
      const completionMessage = workerMessages.find(m =>
        m.type === WorkerMessageType.JOB_COMPLETED && m.jobId === jobId
      );
      const shutdownMessage = workerMessages.find(m => m.type === WorkerMessageType.SHUTDOWN);

      expect(completionMessage).toBeDefined();
      expect(shutdownMessage).toBeDefined();

      // Check message order (completion should come before shutdown)
      const completionIndex = workerMessages.indexOf(completionMessage);
      const shutdownIndex = workerMessages.indexOf(shutdownMessage);
      expect(completionIndex).toBeLessThan(shutdownIndex);
    }, 15000);
  });
});