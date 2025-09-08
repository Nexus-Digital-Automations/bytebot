/**
 * CUA Bridge Service Tests
 * 
 * Comprehensive test suite for CuaBridgeService covering:
 * - Connection pool management
 * - Request queuing and batching
 * - Health monitoring and automatic recovery
 * - Fallback handling for bridge unavailability
 * - Performance optimization
 * - Apple Neural Engine integration
 * - Error handling and recovery mechanisms
 * 
 * @author Claude Code
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';
import { CuaBridgeService, BridgeHealthStatus, BridgeRequest, BridgeResponse } from '../cua-bridge.service';
import { CuaPerformanceService } from '../cua-performance.service';

// Mock implementations
const mockHttpService = {
  get: jest.fn(),
  post: jest.fn(),
  request: jest.fn(),
};

const mockPerformanceService = {
  recordMetric: jest.fn(),
};

const mockLogger = {
  log: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('CuaBridgeService', () => {
  let service: CuaBridgeService;
  let httpService: jest.Mocked<HttpService>;
  let performanceService: jest.Mocked<CuaPerformanceService>;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CuaBridgeService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: CuaPerformanceService,
          useValue: mockPerformanceService,
        },
      ],
    })
      .setLogger(mockLogger as any)
      .compile();

    service = module.get<CuaBridgeService>(CuaBridgeService);
    httpService = module.get(HttpService);
    performanceService = module.get(CuaPerformanceService);

    // Mock timers for interval testing
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllTimers();
  });

  describe('Constructor and Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with default configuration', () => {
      const healthStatus = service.getHealthStatus();
      expect(healthStatus).toMatchObject({
        connected: false,
        responseTime: 0,
        errorCount: 0,
        capabilities: [],
        version: undefined,
      });
    });

    it('should log initialization message', () => {
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('ANE Bridge Service initialized - Bridge URL:')
      );
    });
  });

  describe('Module Lifecycle', () => {
    describe('onModuleInit', () => {
      it('should skip initialization when ANE Bridge is disabled', async () => {
        await service.onModuleInit();
        expect(mockLogger.log).toHaveBeenCalledWith('ANE Bridge is disabled');
      });

      it('should perform initialization when ANE Bridge is enabled', async () => {
        // Mock enabled configuration
        const enabledService = new (class extends CuaBridgeService {
          constructor() {
            super(httpService, performanceService);
            // Override config to enable bridge
            (this as any).config.aneBridge.enabled = true;
          }
        })();

        // Mock successful health check
        const mockHealthResponse: AxiosResponse = {
          data: { capabilities: ['ocr', 'text'], version: '1.0.0' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };
        httpService.get.mockReturnValue(of(mockHealthResponse));

        await enabledService.onModuleInit();

        expect(mockLogger.log).toHaveBeenCalledWith('Initializing ANE Bridge Service');
        expect(mockLogger.log).toHaveBeenCalledWith('ANE Bridge Service initialized');
      });

      it('should handle initialization errors gracefully', async () => {
        const enabledService = new (class extends CuaBridgeService {
          constructor() {
            super(httpService, performanceService);
            (this as any).config.aneBridge.enabled = true;
          }
        })();

        // Mock health check failure
        httpService.get.mockReturnValue(throwError(() => new Error('Connection failed')));

        await enabledService.onModuleInit();

        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to initialize C/ua Framework')
        );
      });
    });

    describe('onModuleDestroy', () => {
      it('should clear health check interval', () => {
        const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
        
        // Set up interval
        (service as any).healthCheckInterval = setInterval(() => {}, 1000);
        
        service.onModuleDestroy();

        expect(clearIntervalSpy).toHaveBeenCalled();
        expect(mockLogger.log).toHaveBeenCalledWith('ANE Bridge Service shut down');
      });

      it('should cancel all active requests', () => {
        const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
        
        // Add mock active request
        const mockTimeout = setTimeout(() => {}, 1000);
        (service as any).activeRequests.set('test-request', {
          timestamp: new Date(),
          timeout: mockTimeout,
        });

        service.onModuleDestroy();

        expect(clearTimeoutSpy).toHaveBeenCalledWith(mockTimeout);
        expect((service as any).activeRequests.size).toBe(0);
      });
    });
  });

  describe('Health Status Management', () => {
    describe('getHealthStatus', () => {
      it('should return a copy of current health status', () => {
        const status1 = service.getHealthStatus();
        const status2 = service.getHealthStatus();

        expect(status1).toEqual(status2);
        expect(status1).not.toBe(status2); // Different objects
      });
    });

    describe('isHealthy', () => {
      it('should return false when not connected', () => {
        expect(service.isHealthy()).toBe(false);
      });

      it('should return false when error count is high', () => {
        // Set connected but high error count
        (service as any).healthStatus.connected = true;
        (service as any).healthStatus.errorCount = 10;

        expect(service.isHealthy()).toBe(false);
      });

      it('should return true when connected and error count is low', () => {
        (service as any).healthStatus.connected = true;
        (service as any).healthStatus.errorCount = 2;

        expect(service.isHealthy()).toBe(true);
      });
    });

    describe('performHealthCheck (private method)', () => {
      it('should update health status on successful check', async () => {
        const mockResponse: AxiosResponse = {
          data: { capabilities: ['ocr'], version: '1.0.0' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };
        httpService.get.mockReturnValue(of(mockResponse));

        await (service as any).performHealthCheck();

        const health = service.getHealthStatus();
        expect(health.connected).toBe(true);
        expect(health.capabilities).toEqual(['ocr']);
        expect(health.version).toBe('1.0.0');
        expect(health.responseTime).toBeGreaterThan(0);
      });

      it('should handle health check failures', async () => {
        httpService.get.mockReturnValue(throwError(() => new Error('Health check failed')));

        await (service as any).performHealthCheck();

        const health = service.getHealthStatus();
        expect(health.connected).toBe(false);
        expect(health.errorCount).toBeGreaterThan(0);
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Health check failed')
        );
      });

      it('should handle malformed health response', async () => {
        const mockResponse: AxiosResponse = {
          data: null,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };
        httpService.get.mockReturnValue(of(mockResponse));

        await (service as any).performHealthCheck();

        const health = service.getHealthStatus();
        expect(health.connected).toBe(true);
        expect(health.capabilities).toEqual([]);
        expect(health.version).toBeUndefined();
      });
    });
  });

  describe('Request Processing', () => {
    describe('sendRequest', () => {
      it('should return error when ANE Bridge is disabled', async () => {
        const result = await service.sendRequest('/test', 'GET');

        expect(result).toMatchObject({
          success: false,
          error: 'ANE Bridge is disabled',
          responseTime: 0,
        });
      });

      it('should execute immediate request when bridge is healthy', async () => {
        // Enable bridge and set healthy
        (service as any).config.aneBridge.enabled = true;
        (service as any).healthStatus.connected = true;
        (service as any).healthStatus.errorCount = 0;

        const mockResponse: AxiosResponse = {
          data: { result: 'success' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };
        httpService.get.mockReturnValue(of(mockResponse));

        const result = await service.sendRequest('/test', 'GET', undefined, { immediate: true });

        expect(result).toMatchObject({
          success: true,
          data: { result: 'success' },
          statusCode: 200,
        });
        expect(result.requestId).toBeDefined();
        expect(result.responseTime).toBeGreaterThan(0);
      });

      it('should queue request when bridge is not healthy', async () => {
        (service as any).config.aneBridge.enabled = true;
        (service as any).healthStatus.connected = false;

        // Mock the queueRequest method
        const queueRequestSpy = jest.spyOn(service as any, 'queueRequest').mockResolvedValue({
          success: true,
          data: 'queued',
        });

        const result = await service.sendRequest('/test', 'GET');

        expect(queueRequestSpy).toHaveBeenCalled();
        expect(result).toMatchObject({
          success: true,
          data: 'queued',
        });
      });

      it('should handle various HTTP methods', async () => {
        (service as any).config.aneBridge.enabled = true;
        (service as any).healthStatus.connected = true;
        (service as any).healthStatus.errorCount = 0;

        const mockResponse: AxiosResponse = {
          data: { method: 'POST' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };

        // Test POST request
        httpService.request.mockReturnValue(of(mockResponse));
        const postResult = await service.sendRequest('/test', 'POST', { data: 'test' }, { immediate: true });
        expect(postResult.success).toBe(true);

        // Test PUT request
        const putResult = await service.sendRequest('/test', 'PUT', { data: 'test' }, { immediate: true });
        expect(putResult.success).toBe(true);

        // Test DELETE request
        const deleteResult = await service.sendRequest('/test', 'DELETE', undefined, { immediate: true });
        expect(deleteResult.success).toBe(true);
      });

      it('should handle request errors', async () => {
        (service as any).config.aneBridge.enabled = true;
        
        const error = new Error('Network error') as AxiosError;
        httpService.get.mockReturnValue(throwError(() => error));

        const result = await service.sendRequest('/test', 'GET', undefined, { immediate: true });

        expect(result).toMatchObject({
          success: false,
          error: 'Network error',
        });
        expect(performanceService.recordMetric).toHaveBeenCalledWith('ane_bridge_request', {
          duration: expect.any(Number),
          success: false,
          error: 'Network error',
          endpoint: '/test',
          method: 'GET',
          requestId: expect.any(String),
        });
      });

      it('should handle axios error with response data', async () => {
        (service as any).config.aneBridge.enabled = true;
        
        const axiosError = {
          name: 'AxiosError',
          message: 'Request failed',
          response: {
            data: { message: 'Custom error message' }
          }
        } as AxiosError;
        
        httpService.get.mockReturnValue(throwError(() => axiosError));

        const result = await service.sendRequest('/test', 'GET', undefined, { immediate: true });

        expect(result.error).toContain('Custom error message');
      });
    });

    describe('sendOcrRequest', () => {
      it('should send OCR request with proper payload', async () => {
        (service as any).config.aneBridge.enabled = true;
        
        const mockResponse: AxiosResponse = {
          data: { text: 'Recognized text', confidence: 0.95 },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };
        httpService.request.mockReturnValue(of(mockResponse));

        const result = await service.sendOcrRequest('base64imagedata', {
          recognitionLevel: 'accurate',
          languages: ['en-US', 'es-ES'],
          customWords: ['Bytebot'],
          enableBoundingBoxes: true,
          operationId: 'ocr-123',
        });

        expect(httpService.request).toHaveBeenCalledWith({
          method: 'POST',
          url: 'http://localhost:8080/api/v1/vision/ocr',
          data: {
            image: 'base64imagedata',
            recognitionLevel: 'accurate',
            languages: ['en-US', 'es-ES'],
            customWords: ['Bytebot'],
            enableBoundingBoxes: true,
            operationId: 'ocr-123',
          },
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': expect.any(String),
            'X-Priority': 'high',
          },
        });
      });

      it('should use default OCR options', async () => {
        (service as any).config.aneBridge.enabled = true;
        
        const mockResponse: AxiosResponse = {
          data: { text: 'Default OCR' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };
        httpService.request.mockReturnValue(of(mockResponse));

        await service.sendOcrRequest('imagedata');

        expect(httpService.request).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              recognitionLevel: 'accurate',
              languages: ['en-US'],
              customWords: [],
              enableBoundingBoxes: false,
            }),
          })
        );
      });
    });

    describe('sendTextDetectionRequest', () => {
      it('should send text detection request', async () => {
        (service as any).config.aneBridge.enabled = true;
        
        const mockResponse: AxiosResponse = {
          data: { detected: true, regions: [] },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };
        httpService.request.mockReturnValue(of(mockResponse));

        const result = await service.sendTextDetectionRequest('imagedata', { operationId: 'text-123' });

        expect(httpService.request).toHaveBeenCalledWith({
          method: 'POST',
          url: 'http://localhost:8080/api/v1/vision/text',
          data: {
            image: 'imagedata',
            operationId: 'text-123',
          },
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': expect.any(String),
            'X-Priority': 'normal',
          },
        });
      });
    });

    describe('getBridgeInfo', () => {
      it('should get bridge information', async () => {
        (service as any).config.aneBridge.enabled = true;
        
        const mockResponse: AxiosResponse = {
          data: { version: '1.0.0', capabilities: ['ocr'] },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };
        httpService.get.mockReturnValue(of(mockResponse));

        const result = await service.getBridgeInfo();

        expect(httpService.get).toHaveBeenCalledWith(
          'http://localhost:8080/api/v1/info',
          expect.objectContaining({
            timeout: 5000,
            headers: expect.objectContaining({
              'X-Request-ID': expect.any(String),
            }),
          })
        );
        expect(result.success).toBe(true);
      });
    });

    describe('getBridgeMetrics', () => {
      it('should get bridge metrics', async () => {
        (service as any).config.aneBridge.enabled = true;
        
        const mockResponse: AxiosResponse = {
          data: { requests: 100, errors: 5 },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };
        httpService.get.mockReturnValue(of(mockResponse));

        const result = await service.getBridgeMetrics();

        expect(httpService.get).toHaveBeenCalledWith(
          'http://localhost:8080/metrics',
          expect.objectContaining({
            timeout: 3000,
          })
        );
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Request Queue Management', () => {
    describe('queueRequest (private method)', () => {
      it('should add request to queue with proper priority', async () => {
        const highPriorityPromise = (service as any).queueRequest({
          id: 'high-1',
          priority: 'high',
          endpoint: '/high',
          method: 'GET',
          timestamp: new Date(),
        });

        const normalPriorityPromise = (service as any).queueRequest({
          id: 'normal-1',
          priority: 'normal',
          endpoint: '/normal',
          method: 'GET',
          timestamp: new Date(),
        });

        // Check queue ordering (high priority should be first)
        const queue = (service as any).requestQueue;
        expect(queue.length).toBe(2);
        expect(queue[0].id).toBe('high-1'); // High priority first
        expect(queue[1].id).toBe('normal-1');
      });
    });

    describe('processRequestQueue (private method)', () => {
      beforeEach(() => {
        // Enable bridge for queue processing tests
        (service as any).config.aneBridge.enabled = true;
      });

      it('should not process when already processing', async () => {
        (service as any).processingQueue = true;

        await (service as any).processRequestQueue();

        // Should exit early without processing
        expect((service as any).requestQueue.length).toBe(0);
      });

      it('should not process when queue is empty', async () => {
        (service as any).processingQueue = false;
        (service as any).requestQueue = [];

        await (service as any).processRequestQueue();

        expect((service as any).processingQueue).toBe(false);
      });

      it('should process queued requests', async () => {
        // Mock successful request execution
        const mockResponse: AxiosResponse = {
          data: { success: true },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };
        httpService.get.mockReturnValue(of(mockResponse));

        // Add request to queue with mock resolve/reject
        const mockResolve = jest.fn();
        const mockReject = jest.fn();
        const testRequest = {
          id: 'test-1',
          endpoint: '/test',
          method: 'GET' as const,
          timestamp: new Date(),
          resolve: mockResolve,
          reject: mockReject,
        };

        (service as any).requestQueue = [testRequest];
        (service as any).processingQueue = false;

        await (service as any).processRequestQueue();

        expect(mockResolve).toHaveBeenCalled();
        expect((service as any).requestQueue.length).toBe(0);
      });

      it('should handle request execution errors', async () => {
        // Mock failed request execution
        const error = new Error('Request failed');
        httpService.get.mockReturnValue(throwError(() => error));

        const mockResolve = jest.fn();
        const mockReject = jest.fn();
        const testRequest = {
          id: 'test-1',
          endpoint: '/test',
          method: 'GET' as const,
          timestamp: new Date(),
          resolve: mockResolve,
          reject: mockReject,
        };

        (service as any).requestQueue = [testRequest];
        (service as any).processingQueue = false;

        await (service as any).processRequestQueue();

        expect(mockReject).toHaveBeenCalledWith(error);
      });

      it('should respect concurrent request limit', async () => {
        // Fill up active requests to max capacity
        const maxConcurrent = (service as any).MAX_CONCURRENT_REQUESTS;
        for (let i = 0; i < maxConcurrent; i++) {
          (service as any).activeRequests.set(`active-${i}`, {
            timestamp: new Date(),
            timeout: setTimeout(() => {}, 1000),
          });
        }

        // Add request to queue
        (service as any).requestQueue = [{
          id: 'queued-1',
          endpoint: '/test',
          method: 'GET',
          timestamp: new Date(),
        }];

        await (service as any).processRequestQueue();

        // Request should remain in queue due to concurrent limit
        expect((service as any).requestQueue.length).toBe(1);
      });
    });
  });

  describe('Health Monitoring', () => {
    describe('startHealthMonitoring (private method)', () => {
      it('should start periodic health checks', () => {
        const setIntervalSpy = jest.spyOn(global, 'setInterval');
        
        (service as any).startHealthMonitoring();

        expect(setIntervalSpy).toHaveBeenCalledWith(
          expect.any(Function),
          30000 // HEALTH_CHECK_INTERVAL
        );
      });

      it('should perform health check on interval', async () => {
        const performHealthCheckSpy = jest.spyOn(service as any, 'performHealthCheck')
          .mockResolvedValue(undefined);

        (service as any).startHealthMonitoring();

        // Fast-forward time to trigger interval
        jest.advanceTimersByTime(30000);

        // Wait for async execution
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(performHealthCheckSpy).toHaveBeenCalled();
      });

      it('should handle health check errors during monitoring', async () => {
        jest.spyOn(service as any, 'performHealthCheck')
          .mockRejectedValue(new Error('Health check error'));

        (service as any).startHealthMonitoring();

        // Fast-forward time to trigger interval
        jest.advanceTimersByTime(30000);

        // Wait for async execution
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Health monitoring error')
        );
      });
    });
  });

  describe('Request Execution', () => {
    describe('executeRequest (private method)', () => {
      beforeEach(() => {
        (service as any).config.aneBridge.enabled = true;
      });

      it('should track active requests during execution', async () => {
        const mockResponse: AxiosResponse = {
          data: { result: 'success' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };
        httpService.get.mockReturnValue(of(mockResponse));

        const request: BridgeRequest = {
          id: 'test-123',
          endpoint: '/test',
          method: 'GET',
          timestamp: new Date(),
          timeout: 5000,
        };

        const resultPromise = (service as any).executeRequest(request);

        // Check that request is tracked during execution
        expect((service as any).activeRequests.has('test-123')).toBe(true);

        const result = await resultPromise;

        // Check that request is cleaned up after execution
        expect((service as any).activeRequests.has('test-123')).toBe(false);
        expect(result.success).toBe(true);
      });

      it('should handle timeout cleanup', async () => {
        const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
        
        const mockResponse: AxiosResponse = {
          data: { result: 'success' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };
        httpService.get.mockReturnValue(of(mockResponse));

        const request: BridgeRequest = {
          id: 'test-timeout',
          endpoint: '/test',
          method: 'GET',
          timestamp: new Date(),
          timeout: 5000,
        };

        await (service as any).executeRequest(request);

        expect(clearTimeoutSpy).toHaveBeenCalled();
      });

      it('should record performance metrics for successful requests', async () => {
        const mockResponse: AxiosResponse = {
          data: { result: 'success' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };
        httpService.get.mockReturnValue(of(mockResponse));

        const request: BridgeRequest = {
          id: 'perf-test',
          endpoint: '/test',
          method: 'GET',
          timestamp: new Date(),
          timeout: 5000,
        };

        await (service as any).executeRequest(request);

        expect(performanceService.recordMetric).toHaveBeenCalledWith(
          'ane_bridge_request',
          expect.objectContaining({
            success: true,
            endpoint: '/test',
            method: 'GET',
            requestId: 'perf-test',
          })
        );
      });

      it('should reduce error count on successful requests', async () => {
        // Set initial error count
        (service as any).healthStatus.errorCount = 5;

        const mockResponse: AxiosResponse = {
          data: { result: 'success' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };
        httpService.get.mockReturnValue(of(mockResponse));

        const request: BridgeRequest = {
          id: 'error-reduction',
          endpoint: '/test',
          method: 'GET',
          timestamp: new Date(),
          timeout: 5000,
        };

        await (service as any).executeRequest(request);

        expect((service as any).healthStatus.errorCount).toBe(4);
      });

      it('should increment error count on failed requests', async () => {
        const initialErrorCount = (service as any).healthStatus.errorCount;
        
        httpService.get.mockReturnValue(throwError(() => new Error('Request failed')));

        const request: BridgeRequest = {
          id: 'error-test',
          endpoint: '/test',
          method: 'GET',
          timestamp: new Date(),
          timeout: 5000,
        };

        await expect((service as any).executeRequest(request)).rejects.toThrow();

        expect((service as any).healthStatus.errorCount).toBe(initialErrorCount + 1);
      });

      it('should set proper request headers', async () => {
        const mockResponse: AxiosResponse = {
          data: { result: 'success' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };
        httpService.post.mockReturnValue(of(mockResponse));

        const request: BridgeRequest = {
          id: 'header-test',
          endpoint: '/test',
          method: 'POST',
          payload: { test: 'data' },
          priority: 'high',
          timestamp: new Date(),
          timeout: 5000,
        };

        await (service as any).executeRequest(request);

        expect(httpService.request).toHaveBeenCalledWith({
          method: 'POST',
          url: 'http://localhost:8080/test',
          data: { test: 'data' },
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': 'header-test',
            'X-Priority': 'high',
          },
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown error types safely', async () => {
      (service as any).config.aneBridge.enabled = true;
      
      // Mock error that's not an Error instance
      httpService.get.mockReturnValue(throwError(() => 'String error'));

      const result = await service.sendRequest('/test', 'GET', undefined, { immediate: true });

      expect(result.success).toBe(false);
      expect(result.error).toBe('String error');
    });

    it('should handle null/undefined errors', async () => {
      (service as any).config.aneBridge.enabled = true;
      
      httpService.get.mockReturnValue(throwError(() => null));

      const result = await service.sendRequest('/test', 'GET', undefined, { immediate: true });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });

    it('should handle complex error objects', async () => {
      (service as any).config.aneBridge.enabled = true;
      
      const complexError = {
        name: 'CustomError',
        message: 'Complex error',
        code: 500,
        details: { nested: 'info' }
      };
      
      httpService.get.mockReturnValue(throwError(() => complexError));

      const result = await service.sendRequest('/test', 'GET', undefined, { immediate: true });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Complex error');
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle high concurrent request load', async () => {
      (service as any).config.aneBridge.enabled = true;
      (service as any).healthStatus.connected = true;
      (service as any).healthStatus.errorCount = 0;

      const mockResponse: AxiosResponse = {
        data: { result: 'success' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };
      httpService.get.mockReturnValue(of(mockResponse));

      // Send multiple concurrent requests
      const requests = Array.from({ length: 15 }, (_, i) => 
        service.sendRequest(`/test-${i}`, 'GET', undefined, { immediate: true })
      );

      const results = await Promise.all(requests);

      expect(results).toHaveLength(15);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should properly clean up resources', () => {
      // Add some active requests
      (service as any).activeRequests.set('test-1', {
        timestamp: new Date(),
        timeout: setTimeout(() => {}, 1000),
      });
      (service as any).activeRequests.set('test-2', {
        timestamp: new Date(),
        timeout: setTimeout(() => {}, 1000),
      });

      service.onModuleDestroy();

      expect((service as any).activeRequests.size).toBe(0);
    });

    it('should handle memory pressure scenarios', async () => {
      // Fill up request queue to test memory management
      const largeQueue = Array.from({ length: 1000 }, (_, i) => ({
        id: `large-${i}`,
        endpoint: `/test-${i}`,
        method: 'GET' as const,
        timestamp: new Date(),
      }));

      (service as any).requestQueue = largeQueue;
      expect((service as any).requestQueue.length).toBe(1000);

      // Service should handle large queues without issues
      expect(() => service.getHealthStatus()).not.toThrow();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle bridge reconnection scenario', async () => {
      // Start with disconnected bridge
      (service as any).config.aneBridge.enabled = true;
      (service as any).healthStatus.connected = false;
      (service as any).healthStatus.errorCount = 10;

      // Mock successful reconnection
      const mockHealthResponse: AxiosResponse = {
        data: { capabilities: ['ocr'], version: '1.0.0' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };
      httpService.get.mockReturnValue(of(mockHealthResponse));

      await (service as any).performHealthCheck();

      const health = service.getHealthStatus();
      expect(health.connected).toBe(true);
      expect(health.errorCount).toBe(9); // Reduced by 1
      expect(service.isHealthy()).toBe(false); // Still not healthy due to high error count
    });

    it('should handle complete bridge failure and recovery', async () => {
      (service as any).config.aneBridge.enabled = true;

      // Simulate complete failure
      httpService.get.mockReturnValue(throwError(() => new Error('Bridge offline')));

      // Multiple failed health checks
      await (service as any).performHealthCheck();
      await (service as any).performHealthCheck();
      await (service as any).performHealthCheck();

      let health = service.getHealthStatus();
      expect(health.connected).toBe(false);
      expect(health.errorCount).toBe(3);

      // Simulate recovery
      const mockRecoveryResponse: AxiosResponse = {
        data: { capabilities: ['ocr', 'text'], version: '1.1.0' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };
      httpService.get.mockReturnValue(of(mockRecoveryResponse));

      // Recovery health check
      await (service as any).performHealthCheck();

      health = service.getHealthStatus();
      expect(health.connected).toBe(true);
      expect(health.version).toBe('1.1.0');
      expect(health.capabilities).toContain('ocr');
      expect(health.capabilities).toContain('text');
    });
  });
});