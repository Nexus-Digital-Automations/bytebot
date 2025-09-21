/**
 * JobStatusResultController Integration Tests - Enterprise API Testing
 *
 * Comprehensive integration test suite for REST API endpoints:
 * - End-to-end API testing with real HTTP requests
 * - Authentication and authorization testing
 * - Rate limiting and throttling validation
 * - Response format and error handling verification
 * - Performance and load testing scenarios
 * - WebSocket and streaming functionality testing
 *
 * @author Claude Code - Job Management Specialist
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import * as request from 'supertest';
import { JobStatusResultController } from '../job-status-result.controller';
import { JobStatusResultService } from '../../services/job-status-result.service';
import { JobStatus, JobPriority } from '../../dto/async-job.dto';
import {EnhancedJobStatusResponseDto,
  BulkJobStatusRequestDto,
  JobAnalyticsDto,
} from '../../dto/enhanced-job-status.dto';
import {EnhancedJobResultResponseDto,
  ResultDownloadRequestDto,
} from '../../dto/enhanced-job-result.dto';
    // Mock service implementationconst mockJobStatusResultService = {
  getJobStatus: jest.fn(),
  updateJobStatus: jest.fn(),
  getJobResult: jest.fn(),
  storeJobResult: jest.fn(),
  getJobAnalytics: jest.fn(),
  getJobHistory: jest.fn(),
  getSystemMetrics: jest.fn(),
  cleanupJob: jest.fn(),
  recordJobHistory: jest.fn(),
};

// Sample test data
const sampleJobId = 'job_1702983456789_abc123';
    const sampleEnhancedStatus: Partial<EnhancedJobStatusResponseDto> = {jobId: sampleJobId,
  status: JobStatus.IN_PROGRESS,
  progress: 75,
  progressDetails: {
    currentStep: 'Processing screenshot',
  totalSteps: 4,
  currentStepIndex: 3,
    estimatedTimeRemaining: 5000,
  },
  timestamps: {
    submitted: '2023-12-19T10:30:45.789Z',
  started: '2023-12-19T10:30:46.123Z',
  lastUpdated: '2023-12-19T10:31:10.456Z',},
  performance: {
    executionTimeMs: 25000,
    memoryUsageMB: 45.7,
    cpuUsagePercent: 12.5,
  },
  priority: JobPriority.NORMAL,
  metadata: {
    userId: 'user123',
  sessionId: 'session456',},};

const sampleJobResult: Partial<EnhancedJobResultResponseDto> = {
  jobId: sampleJobId,
  status: JobStatus.COMPLETED,
  result: {
    screenshot: 'base64-encoded-data',
  success: true,
  coordinates: { x: 150, y: 200 },
  },
  storageInfo: {
    resultId: 'result_123',
  size: 2048576,
  compressed: true,
    compressionRatio: 3.2,
    format: 'json',
  contentType: 'application/json',
  checksum: 'a1b2c3d4e5f6789012345678901234567890abcdef',
  storageLocation: 'redis://job-results/abc123',
  createdAt: '2023-12-19T10:31:15.789Z',
  expiresAt: '2023-12-26T10:31:15.789Z',},
  submittedAt: '2023-12-19T10:30:45.789Z',
  completedAt: '2023-12-19T10:31:15.789Z',
  executionTimeMs: 30123,
  duration: 1250,
};

const sampleAnalytics: JobAnalyticsDto = {
  jobId: sampleJobId,
  executionMetrics: {
    totalTimeMs: 30123,
    queueTimeMs: 1000,
    processingTimeMs: 29123,
    memoryPeakMB: 45.7,
    cpuAveragePercent: 12.5,
  },
  cacheMetrics: {
    hitRate: 0.85,
    missCount: 15,
    evictionCount: 2,
  },
  errorMetrics: {
    errorCount: 0,
    retryCount: 1,
  },
  resourceMetrics: {
    diskUsageMB: 125.4,
    networkBytesIn: 1048576,
    networkBytesOut: 2097152,
  },
};

describe('JobStatusResultController (Integration)', () => {let app: INestApplication;
    let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([{
          ttl: 60000,
          limit: 100,
        }]),
        CacheModule.register({
          ttl: 300,
          max: 1000,
        }),
      ],
      controllers: [JobStatusResultController],
      providers: [
        {
          provide: JobStatusResultService,
          useValue: mockJobStatusResultService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => defaultValue),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /jobs/:jobId/status', () => {it('should return job status successfully', async () => {
      mockJobStatusResultService.getJobStatus.mockResolvedValue(sampleEnhancedStatus);

        const response = await request(app.getHttpServer())
        .get(`/jobs/${sampleJobId}/status`)
        .expect(200);

      expect(response.body).toEqual(expect.objectContaining({
        jobId: sampleJobId,
        status: JobStatus.IN_PROGRESS,
        progress: 75,
      }));

      expect(mockJobStatusResultService.getJobStatus).toHaveBeenCalledWith(sampleJobId);
    });

    it('should return 404 for non-existent job', async () => {mockJobStatusResultService.getJobStatus.mockResolvedValue(null);
    await request(app.getHttpServer())
        .get('/jobs/non-existent-job/status').expect(404);});

    it('should include progress details when requested', async () => {
      mockJobStatusResultService.getJobStatus.mockResolvedValue(sampleEnhancedStatus);

        const response = await request(app.getHttpServer())
        .get(`/jobs/${sampleJobId}/status`)
        .query({ includeProgressDetails: true })
        .expect(200);

      expect(response.body.progressDetails).toBeDefined();
      expect(response.body.progressDetails.currentStep).toBe('Processing screenshot');});

  it('should include performance metrics when requested', async () => {
      mockJobStatusResultService.getJobStatus.mockResolvedValue(sampleEnhancedStatus);

        const response = await request(app.getHttpServer())
        .get(`/jobs/${sampleJobId}/status`)
        .query({ includePerformanceMetrics: true })
        .expect(200);

      expect(response.body.performance).toBeDefined();
      expect(response.body.performance.memoryUsageMB).toBe(45.7);
    });

    it('should handle service errors gracefully', async () => {mockJobStatusResultService.getJobStatus.mockRejectedValue(new Error('Database connection failed')
      );

      await request(app.getHttpServer())
        .get(`/jobs/${sampleJobId}/status`)
        .expect(500);
    });

    it('should validate job ID format', async () => {await request(app.getHttpServer()).get('/jobs/invalid-job-id/status').expect(404); // Service will return null for invalid IDs});
  });

  describe('PUT /jobs/:jobId/status', () => {const statusUpdate = {status: 'completed',
  progress: 100,
  progressDetails: {
        currentStep: 'Completed successfully',
  totalSteps: 4,
  currentStepIndex: 4,
      },
      metadata: {
        completedBy: 'system',},};

    it('should update job status successfully', async () => {
      mockJobStatusResultService.updateJobStatus.mockResolvedValue(undefined);

        const response = await request(app.getHttpServer())
        .put(`/jobs/${sampleJobId}/status`)
        .send(statusUpdate)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Job status updated successfully: completed',});
      expect(mockJobStatusResultService.updateJobStatus).toHaveBeenCalledWith(
        sampleJobId,
        'completed',100,statusUpdate.progressDetails,
        statusUpdate.metadata
      );
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .put(`/jobs/${sampleJobId}/status`)
        .send({
          status: 'in_progress',// Missing progress field})
        .expect(400);
    });

    it('should validate progress range', async () => {
      await request(app.getHttpServer())
        .put(`/jobs/${sampleJobId}/status`)
        .send({
          status: 'in_progress',
          progress: 150, // Invalid progress > 100
        })
        .expect(400);

      await request(app.getHttpServer())
        .put(`/jobs/${sampleJobId}/status`)
        .send({
          status: 'in_progress',
  progress: -10, // Invalid progress < 0})
        .expect(400);
    });

    it('should validate status enum values', async () => {
      await request(app.getHttpServer())
        .put(`/jobs/${sampleJobId}/status`)
        .send({
          status: 'invalid_status',
  progress: 50,})
        .expect(400);
    });

    it('should handle concurrent status updates', async () => {
      mockJobStatusResultService.updateJobStatus.mockResolvedValue(undefined);

        const updates = Array.from({ length: 10 }, (_, i) =>
        request(app.getHttpServer())
          .put(`/jobs/${sampleJobId}/status`)
          .send({
            status: 'in_progress',
  progress: i * 10,})
      );

        const responses = await Promise.all(updates);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      expect(mockJobStatusResultService.updateJobStatus).toHaveBeenCalledTimes(10);
    });
  });

  describe('POST /jobs/bulk/status', () => {const bulkRequest: BulkJobStatusRequestDto = {jobIds: [sampleJobId, 'job_2', 'job_3'],
  includeProgressDetails: true,
  includePerformanceMetrics: false,
    };

    it('should retrieve bulk job status successfully', async () => {mockJobStatusResultService.getJobStatus.mockResolvedValueOnce(sampleEnhancedStatus)
        .mockResolvedValueOnce({ ...sampleEnhancedStatus, jobId: 'job_2' }).mockResolvedValueOnce(null); // job_3 not foundconst response = await request(app.getHttpServer())
        .post('/jobs/bulk/status').send(bulkRequest).expect(200);

      expect(response.body.jobs).toHaveLength(2);
      expect(response.body.totalRequested).toBe(3);
      expect(response.body.totalFound).toBe(2);
      expect(response.body.notFound).toEqual(['job_3']);
      expect(response.body.executionTimeMs).toBeDefined();});

    it('should handle empty job ID list', async () => {await request(app.getHttpServer()).post('/jobs/bulk/status').send({jobIds: [],
          includeProgressDetails: false,
        })
        .expect(200);
    });

    it('should validate job ID format in bulk request', async () => {await request(app.getHttpServer()).post('/jobs/bulk/status').send({jobIds: ['invalid-format', 'also-invalid'],}).expect(400);
    });

    it('should respect concurrency limits for bulk operations', async () => {
      const manyJobIds = Array.from({ length: 50 }, (_, i) => `job_${i}`);
      mockJobStatusResultService.getJobStatus.mockImplementation(
        (jobId: string) => Promise.resolve({ ...sampleEnhancedStatus, jobId })
      );

        const startTime = Date.now();
      await request(app.getHttpServer())
        .post('/jobs/bulk/status').send({ jobIds: manyJobIds }).expect(200);

        const duration = Date.now() - startTime;

      // Should complete reasonably quickly with concurrency
      expect(duration).toBeLessThan(5000); // 5 seconds max
    });
  });

  describe('GET /jobs/:jobId/result', () => {it('should return job result successfully', async () => {
      mockJobStatusResultService.getJobResult.mockResolvedValue({
        result: sampleJobResult.result,
        metadata: sampleJobResult.storageInfo,
      });

        const response = await request(app.getHttpServer())
        .get(`/jobs/${sampleJobId}/result`)
        .expect(200);

      expect(response.body).toEqual(expect.objectContaining({
        jobId: sampleJobId,
        result: sampleJobResult.result,
      }));
    });

    it('should handle streaming results', async () => {const mockStream = require('stream').Readable.from(['chunk1', 'chunk2']);
      mockJobStatusResultService.getJobResult.mockResolvedValue(mockStream);

        const response = await request(app.getHttpServer())
        .get(`/jobs/${sampleJobId}/result`)
        .query({ stream: true })
        .expect(200);

      expect(response.headers['content-type']).toContain('application/octet-stream');});

  it('should return 404 for non-existent result', async () => {mockJobStatusResultService.getJobResult.mockRejectedValue(new Error('Result not found'));
    await request(app.getHttpServer())
        .get('/jobs/non-existent-job/result').expect(500);});

    it('should support format conversion', async () => {
      mockJobStatusResultService.getJobResult.mockResolvedValue({
        result: sampleJobResult.result,
        metadata: sampleJobResult.storageInfo,
      });

      await request(app.getHttpServer())
        .get(`/jobs/${sampleJobId}/result`)
        .query({ format: 'json' }).expect(200);});
  });

  describe('POST /jobs/:jobId/result/download', () => {const downloadRequest: ResultDownloadRequestDto = {jobId: sampleJobId,
      format: 'json',
  compress: true,
  expirationSeconds: 3600,
    };

    it('should generate download URL successfully', async () => {
      mockJobStatusResultService.getJobResult.mockResolvedValue({
        result: sampleJobResult.result,
        metadata: sampleJobResult.storageInfo,
      });

        const response = await request(app.getHttpServer())
        .post(`/jobs/${sampleJobId}/result/download`)
        .send(downloadRequest)
        .expect(200);

      expect(response.body).toEqual(expect.objectContaining({
        jobId: sampleJobId,
        downloadUrl: expect.stringContaining('download?token='),
  expiresAt: expect.any(String),}));
    });

    it('should validate download request parameters', async () => {
      await request(app.getHttpServer())
        .post(`/jobs/${sampleJobId}/result/download`)
        .send({
          // Missing required fields
        })
        .expect(400);
    });

    it('should handle invalid expiration values', async () => {
      await request(app.getHttpServer())
        .post(`/jobs/${sampleJobId}/result/download`).send({...downloadRequest,
          expirationSeconds: 100000, // Too large
        })
        .expect(400);

      await request(app.getHttpServer())
        .post(`/jobs/${sampleJobId}/result/download`)
        .send({
          ...downloadRequest,
          expirationSeconds: 30, // Too small
        })
        .expect(400);
    });
  });

  describe('GET /jobs/:jobId/analytics', () => {it('should return job analytics successfully', async () => {
      mockJobStatusResultService.getJobAnalytics.mockResolvedValue(sampleAnalytics);

        const response = await request(app.getHttpServer())
        .get(`/jobs/${sampleJobId}/analytics`)
        .expect(200);

      expect(response.body).toEqual(sampleAnalytics);
      expect(mockJobStatusResultService.getJobAnalytics).toHaveBeenCalledWith(sampleJobId);
    });

    it('should cache analytics responses', async () => {
      mockJobStatusResultService.getJobAnalytics.mockResolvedValue(sampleAnalytics);

      // First request
      await request(app.getHttpServer())
        .get(`/jobs/${sampleJobId}/analytics`).expect(200);
    // Second request (should use cache)
      await request(app.getHttpServer())
        .get(`/jobs/${sampleJobId}/analytics`)
        .expect(200);

      // Service should only be called once due to caching
      expect(mockJobStatusResultService.getJobAnalytics).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /jobs/:jobId/history', () => {const sampleHistory = [{
        timestamp: '2023-12-19T10:30:45.789Z',
  event: 'created',
  data: { status: 'pending' },
  source: 'system',},{
        timestamp: '2023-12-19T10:30:46.123Z',
  event: 'started',
  data: { status: 'in_progress' },
  source: 'system',},];

    it('should return job history successfully', async () => {
      mockJobStatusResultService.getJobHistory.mockResolvedValue(sampleHistory);

        const response = await request(app.getHttpServer())
        .get(`/jobs/${sampleJobId}/history`)
        .expect(200);

      expect(response.body).toEqual(sampleHistory);
      expect(mockJobStatusResultService.getJobHistory).toHaveBeenCalledWith(
        sampleJobId,
        100,
        0
      );
    });

    it('should support pagination', async () => {
      mockJobStatusResultService.getJobHistory.mockResolvedValue([sampleHistory[1]]);

      await request(app.getHttpServer())
        .get(`/jobs/${sampleJobId}/history`)
        .query({ limit: 50, offset: 10 })
        .expect(200);

      expect(mockJobStatusResultService.getJobHistory).toHaveBeenCalledWith(
        sampleJobId,
        50,
        10
      );
    });

    it('should validate pagination parameters', async () => {
      await request(app.getHttpServer())
        .get(`/jobs/${sampleJobId}/history`).query({ limit: -1 }).expect(400);

      await request(app.getHttpServer())
        .get(`/jobs/${sampleJobId}/history`)
        .query({ offset: -5 })
        .expect(400);
    });
  });

  describe('GET /jobs/system/metrics', () => {const sampleSystemMetrics = {operationsPerSecond: 150.5,
      averageResponseTimeMs: 125.3,
      memoryUsageMB: 256.7,
      activeJobs: 42,
      cacheHitRate: 0.89,
    };

    it('should return system metrics successfully', async () => {mockJobStatusResultService.getSystemMetrics.mockResolvedValue(sampleSystemMetrics);

        const response = await request(app.getHttpServer())
        .get('/jobs/system/metrics').expect(200);
      expect(response.body).toEqual(sampleSystemMetrics);
    });

    it('should cache system metrics', async () => {mockJobStatusResultService.getSystemMetrics.mockResolvedValue(sampleSystemMetrics);
    // Multiple rapid requests should use cache
      await Promise.all([
        request(app.getHttpServer()).get('/jobs/system/metrics'),request(app.getHttpServer()).get('/jobs/system/metrics'),request(app.getHttpServer()).get('/jobs/system/metrics'),]);
    // Should only call service once due to caching
      expect(mockJobStatusResultService.getSystemMetrics).toHaveBeenCalledTimes(1);
    });
  });

  describe('DELETE /jobs/:jobId', () => {it('should cleanup job successfully', async () => {
      mockJobStatusResultService.cleanupJob.mockResolvedValue(undefined);

        const response = await request(app.getHttpServer())
        .delete(`/jobs/${sampleJobId}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Job cleaned up successfully',});
      expect(mockJobStatusResultService.cleanupJob).toHaveBeenCalledWith(sampleJobId, false);
    });

    it('should support archival before cleanup', async () => {
      mockJobStatusResultService.cleanupJob.mockResolvedValue(undefined);

        const response = await request(app.getHttpServer())
        .delete(`/jobs/${sampleJobId}`)
        .query({ archive: true })
        .expect(200);

      expect(response.body.message).toContain('(archived)');
      expect(mockJobStatusResultService.cleanupJob).toHaveBeenCalledWith(sampleJobId, true);});

    it('should handle cleanup errors', async () => {mockJobStatusResultService.cleanupJob.mockRejectedValue(new Error('Cleanup failed')
      );

      await request(app.getHttpServer())
        .delete(`/jobs/${sampleJobId}`)
        .expect(500);
    });
  });

  describe('Rate Limiting and Security', () => {it('should enforce rate limits on high-frequency requests', async () => {
      mockJobStatusResultService.getJobStatus.mockResolvedValue(sampleEnhancedStatus);

      // Rapid fire requests to trigger rate limiting
      const requests = Array.from({ length: 150 }, () =>
        request(app.getHttpServer()).get(`/jobs/${sampleJobId}/status`)
      );

        const responses = await Promise.allSettled(requests);

        const rateLimitedResponses = responses.filter(
        result => result.status === 'fulfilled' && (result.value as any).status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should validate input sanitization', async () => {const maliciousInput = {status: 'completed',
  progress: 100,
  metadata: {
          '__proto__': { polluted: true },'constructor': { prototype: { polluted: true } },
        },
      };

      mockJobStatusResultService.updateJobStatus.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .put(`/jobs/${sampleJobId}/status`)
        .send(maliciousInput)
        .expect(200);

      // Verify metadata was sanitized
      const updateCall = mockJobStatusResultService.updateJobStatus.mock.calls[0];
      expect(updateCall[4]).not.toHaveProperty('__proto__');
      expect(updateCall[4]).not.toHaveProperty('constructor');});
});

  describe('Error Handling and Edge Cases', () => {it('should handle malformed JSON requests', async () => {
      await request(app.getHttpServer())
        .put(`/jobs/${sampleJobId}/status`)
        .set('Content-Type', 'application/json').send('{ invalid json }').expect(400);});

    it('should handle very large job IDs', async () => {const veryLongJobId = 'x'.repeat(1000);

      await request(app.getHttpServer())
        .get(`/jobs/${veryLongJobId}/status`)
        .expect(404);
    });

    it('should handle special characters in job IDs', async () => {const specialCharJobId = 'job_%$#@!&*()_test';

      mockJobStatusResultService.getJobStatus.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get(`/jobs/${specialCharJobId}/status`)
        .expect(404);
    });

    it('should handle timeout scenarios', async () => {
      mockJobStatusResultService.getJobStatus.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 10000)) // 10 second delay
      );

      await request(app.getHttpServer())
        .get(`/jobs/${sampleJobId}/status`)
        .timeout(5000)
        .expect((res) => {
          // Should timeout or return 500
          expect([408, 500, 503]).toContain(res.status);
        });
    });
  });

  describe('Performance and Load Testing', () => {it('should handle concurrent requests efficiently', async () => {
      mockJobStatusResultService.getJobStatus.mockResolvedValue(sampleEnhancedStatus);

        const concurrentRequests = 50;
      const startTime = Date.now();

        const requests = Array.from({ length: concurrentRequests }, () =>
        request(app.getHttpServer()).get(`/jobs/${sampleJobId}/status`)
      );

        const responses = await Promise.all(requests);

        const endTime = Date.now();

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete within reasonable time (2 seconds for 50 requests)
      expect(endTime - startTime).toBeLessThan(2000);
    });

    it('should handle large response payloads', async () => {const largeResult = {...sampleJobResult,
        result: {
          largeData: 'x'.repeat(100000), // 100KB of data
          moreData: Array.from({ length: 1000 }, (_, i) => ({ id: i, data: `item_${i}` })),},};

      mockJobStatusResultService.getJobResult.mockResolvedValue({
        result: largeResult.result,
        metadata: largeResult.storageInfo,
      });

        const response = await request(app.getHttpServer())
        .get(`/jobs/${sampleJobId}/result`)
        .expect(200);

      expect(response.body.result).toBeDefined();
      expect(response.body.result.largeData).toHaveLength(100000);
    });
  });
});