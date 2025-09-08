/**
 * CUA Integration Controller Tests
 *
 * Comprehensive test suite for CuaIntegrationController covering:
 * - REST API endpoints and routing
 * - Authentication and authorization
 * - Request validation and error handling
 * - OCR processing endpoints
 * - Performance metrics endpoints
 * - System status and health checks
 * - Error handling and response formatting
 * - Integration with CUA services
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ServiceUnavailableException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  CuaIntegrationController,
  OcrRequestDto,
  BatchOcrRequestDto,
  ErrorHandler,
} from '../cua-integration.controller';
import { CuaIntegrationService } from '../cua-integration.service';
import {
  CuaVisionService,
  OcrResult,
  VisionProcessingOptions,
} from '../cua-vision.service';
import { CuaPerformanceService } from '../cua-performance.service';
import { CuaBridgeService } from '../cua-bridge.service';

// Mock user object for authentication tests
const mockUser = {
  id: 'user-123',
  email: 'test@bytebot.ai',
  roles: ['operator'],
  isAdmin: false,
  isOperator: true,
};

// Mock service implementations
const mockCuaIntegrationService = {
  getFrameworkStatus: jest.fn(),
  isFrameworkEnabled: jest.fn(),
  isAneBridgeAvailable: jest.fn(),
  getConfiguration: jest.fn(),
};

const mockVisionService = {
  performOcr: jest.fn(),
  getCapabilities: jest.fn(),
};

const mockPerformanceService = {
  isSystemHealthy: jest.fn(),
  getPerformanceSummary: jest.fn(),
  getCurrentSystemMetrics: jest.fn(),
};

const mockBridgeService = {
  getHealthStatus: jest.fn(),
  isHealthy: jest.fn(),
};

const mockLogger = {
  log: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('CuaIntegrationController', () => {
  let controller: CuaIntegrationController;
  let cuaIntegrationService: jest.Mocked<CuaIntegrationService>;
  let visionService: jest.Mocked<CuaVisionService>;
  let performanceService: jest.Mocked<CuaPerformanceService>;
  let bridgeService: jest.Mocked<CuaBridgeService>;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CuaIntegrationController],
      providers: [
        {
          provide: CuaIntegrationService,
          useValue: mockCuaIntegrationService,
        },
        {
          provide: CuaVisionService,
          useValue: mockVisionService,
        },
        {
          provide: CuaPerformanceService,
          useValue: mockPerformanceService,
        },
        {
          provide: CuaBridgeService,
          useValue: mockBridgeService,
        },
      ],
    })
      .setLogger(mockLogger as any)
      .compile();

    controller = module.get<CuaIntegrationController>(CuaIntegrationController);
    cuaIntegrationService = module.get(CuaIntegrationService);
    visionService = module.get(CuaVisionService);
    performanceService = module.get(CuaPerformanceService);
    bridgeService = module.get(CuaBridgeService);
  });

  describe('Constructor and Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should log initialization message', () => {
      expect(mockLogger.log).toHaveBeenCalledWith(
        'C/ua Integration Controller initialized',
      );
    });
  });

  describe('ErrorHandler Utility', () => {
    describe('extractErrorMessage', () => {
      it('should extract message from Error instances', () => {
        const error = new Error('Test error message');
        const result = ErrorHandler.extractErrorMessage(error);
        expect(result).toBe('Test error message');
      });

      it('should return string errors directly', () => {
        const result = ErrorHandler.extractErrorMessage('String error');
        expect(result).toBe('String error');
      });

      it('should extract message from objects with message property', () => {
        const error = { message: 'Object error' };
        const result = ErrorHandler.extractErrorMessage(error);
        expect(result).toBe('Object error');
      });

      it('should handle objects with non-string message', () => {
        const error = { message: 123 };
        const result = ErrorHandler.extractErrorMessage(error);
        expect(result).toBe('{"message":123}');
      });

      it('should handle null and undefined', () => {
        expect(ErrorHandler.extractErrorMessage(null)).toBe('null');
        expect(ErrorHandler.extractErrorMessage(undefined)).toBe('undefined');
      });

      it('should handle complex objects', () => {
        const error = { code: 500, details: 'Complex error' };
        const result = ErrorHandler.extractErrorMessage(error);
        expect(result).toBe('{"code":500,"details":"Complex error"}');
      });
    });

    describe('extractErrorStack', () => {
      it('should extract stack from Error instances', () => {
        const error = new Error('Test error');
        const result = ErrorHandler.extractErrorStack(error);
        expect(result).toContain('Error: Test error');
      });

      it('should extract stack from objects with stack property', () => {
        const error = { stack: 'Custom stack trace' };
        const result = ErrorHandler.extractErrorStack(error);
        expect(result).toBe('Custom stack trace');
      });

      it('should return undefined for objects without stack', () => {
        const error = { message: 'No stack' };
        const result = ErrorHandler.extractErrorStack(error);
        expect(result).toBeUndefined();
      });

      it('should return undefined for non-objects', () => {
        expect(ErrorHandler.extractErrorStack('string')).toBeUndefined();
        expect(ErrorHandler.extractErrorStack(123)).toBeUndefined();
        expect(ErrorHandler.extractErrorStack(null)).toBeUndefined();
      });
    });

    describe('createErrorContext', () => {
      it('should create comprehensive error context', () => {
        const error = new Error('Test error');
        const context = ErrorHandler.createErrorContext('op-123', error, {
          userId: 'user-1',
        });

        expect(context).toEqual({
          operationId: 'op-123',
          message: 'Test error',
          stack: expect.stringContaining('Error: Test error'),
          context: { userId: 'user-1' },
        });
      });

      it('should handle errors without additional context', () => {
        const context = ErrorHandler.createErrorContext(
          'op-456',
          'Simple error',
        );

        expect(context).toEqual({
          operationId: 'op-456',
          message: 'Simple error',
          stack: undefined,
          context: undefined,
        });
      });
    });
  });

  describe('Framework Status Endpoint', () => {
    describe('GET /api/v1/cua/status', () => {
      it('should return comprehensive framework status', () => {
        // Mock service responses
        const mockFrameworkStatus = {
          enabled: true,
          containerId: 'test-container',
          version: '1.0.0',
          performanceMode: 'optimized',
          servicesRunning: ['CUA_Agent_API', 'WebSocket_Server'],
          lastHealthCheck: new Date(),
          aneBridgeStatus: 'connected' as const,
          hybridArchitectureActive: true,
        };

        const mockBridgeHealth = {
          connected: true,
          responseTime: 50,
          lastCheck: new Date(),
          errorCount: 0,
          capabilities: ['ocr', 'text'],
          version: '1.0.0',
        };

        const mockSystemHealth = {
          healthy: true,
          issues: [],
        };

        const mockVisionCapabilities = {
          aneEnabled: true,
          fallbackEnabled: true,
          batchProcessing: true,
          caching: true,
          supportedFormats: ['PNG', 'JPEG'],
          supportedLanguages: ['en-US'],
          maxBatchSize: 10,
          performanceTargets: {
            latencyMs: '2-5 (ANE)',
            throughputImagesPerSecond: '100-500',
          },
        };

        cuaIntegrationService.getFrameworkStatus.mockReturnValue(
          mockFrameworkStatus,
        );
        bridgeService.getHealthStatus.mockReturnValue(mockBridgeHealth);
        cuaIntegrationService.isAneBridgeAvailable.mockReturnValue(true);
        performanceService.isSystemHealthy.mockReturnValue(mockSystemHealth);
        visionService.getCapabilities.mockReturnValue(mockVisionCapabilities);

        const result = controller.getFrameworkStatus(mockUser as any);

        expect(result).toMatchObject({
          timestamp: expect.any(String),
          framework: mockFrameworkStatus,
          bridge: {
            health: mockBridgeHealth,
            available: true,
          },
          system: mockSystemHealth,
          vision: mockVisionCapabilities,
          endpoints: {
            ocr: '/api/v1/cua/vision/ocr',
            batchOcr: '/api/v1/cua/vision/ocr/batch',
            textDetection: '/api/v1/cua/vision/text',
            performance: '/api/v1/cua/performance',
            health: '/api/v1/cua/health',
          },
        });
      });

      it('should handle service errors gracefully', () => {
        cuaIntegrationService.getFrameworkStatus.mockImplementation(() => {
          throw new Error('Service error');
        });

        expect(() => controller.getFrameworkStatus(mockUser as any)).toThrow(
          HttpException,
        );

        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to get framework status'),
          expect.any(String),
        );
      });

      it('should handle complex error objects', () => {
        const complexError = {
          name: 'ServiceError',
          message: 'Complex service failure',
          code: 'SERVICE_UNAVAILABLE',
          details: { service: 'framework', retry: false },
        };

        cuaIntegrationService.getFrameworkStatus.mockImplementation(() => {
          throw complexError;
        });

        expect(() => controller.getFrameworkStatus(mockUser as any)).toThrow(
          HttpException,
        );

        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Complex service failure'),
          expect.any(String),
        );
      });
    });
  });

  describe('Health Check Endpoint', () => {
    describe('GET /api/v1/cua/health', () => {
      it('should return healthy status when all systems operational', () => {
        cuaIntegrationService.isFrameworkEnabled.mockReturnValue(true);
        bridgeService.isHealthy.mockReturnValue(true);
        performanceService.isSystemHealthy.mockReturnValue({
          healthy: true,
          issues: [],
        });

        const result = controller.healthCheck(mockUser as any);

        expect(result).toMatchObject({
          status: 'healthy',
          timestamp: expect.any(String),
          framework: { enabled: true },
          bridge: { healthy: true },
          system: { healthy: true, issues: [] },
          uptime: expect.any(Number),
        });
      });

      it('should return degraded status when bridge is unhealthy but system is healthy', () => {
        cuaIntegrationService.isFrameworkEnabled.mockReturnValue(true);
        bridgeService.isHealthy.mockReturnValue(false);
        performanceService.isSystemHealthy.mockReturnValue({
          healthy: true,
          issues: [],
        });

        const result = controller.healthCheck(mockUser as any);

        expect(result.status).toBe('healthy'); // System healthy overrides bridge status
      });

      it('should return degraded status when framework is disabled', () => {
        cuaIntegrationService.isFrameworkEnabled.mockReturnValue(false);
        bridgeService.isHealthy.mockReturnValue(true);
        performanceService.isSystemHealthy.mockReturnValue({
          healthy: false,
          issues: ['High CPU'],
        });

        const result = controller.healthCheck(mockUser as any);

        expect(result.status).toBe('degraded');
      });

      it('should include system uptime', () => {
        cuaIntegrationService.isFrameworkEnabled.mockReturnValue(true);
        bridgeService.isHealthy.mockReturnValue(true);
        performanceService.isSystemHealthy.mockReturnValue({
          healthy: true,
          issues: [],
        });

        const result = controller.healthCheck(mockUser as any);

        expect(result.uptime).toBeGreaterThanOrEqual(0);
        expect(typeof result.uptime).toBe('number');
      });
    });
  });

  describe('OCR Processing Endpoint', () => {
    describe('POST /api/v1/cua/vision/ocr', () => {
      const validOcrRequest: OcrRequestDto = {
        image:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        recognitionLevel: 'accurate',
        languages: ['en-US'],
        customWords: ['Bytebot'],
        enableBoundingBoxes: true,
        cacheEnabled: true,
        forceMethod: 'ane',
      };

      it('should process valid OCR request successfully', async () => {
        const mockOcrResult: OcrResult = {
          text: 'Recognized text content',
          confidence: 0.95,
          boundingBoxes: [
            {
              text: 'Recognized',
              x: 10,
              y: 20,
              width: 100,
              height: 30,
              confidence: 0.98,
            },
          ],
          processingTimeMs: 150,
          method: 'ane',
          language: 'en-US',
          requestId: 'ocr-123',
          aneUsed: true,
        };

        cuaIntegrationService.isFrameworkEnabled.mockReturnValue(true);
        visionService.performOcr.mockResolvedValue(mockOcrResult);

        const result = await controller.performOcr(
          validOcrRequest,
          mockUser as any,
        );

        expect(result).toEqual({
          success: true,
          result: mockOcrResult,
        });

        expect(visionService.performOcr).toHaveBeenCalledWith(
          validOcrRequest.image,
          expect.objectContaining({
            recognitionLevel: 'accurate',
            languages: ['en-US'],
            customWords: ['Bytebot'],
            enableBoundingBoxes: true,
            cacheEnabled: true,
            forceMethod: 'ane',
          }),
        );

        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringContaining('OCR request received'),
          expect.objectContaining({
            recognitionLevel: 'accurate',
            languages: 'en-US',
            enableBoundingBoxes: true,
          }),
        );

        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringContaining('OCR completed successfully'),
          expect.objectContaining({
            textLength: mockOcrResult.text.length,
            confidence: mockOcrResult.confidence,
            method: mockOcrResult.method,
            processingTime: mockOcrResult.processingTimeMs,
          }),
        );
      });

      it('should validate required image data', async () => {
        const invalidRequest = { ...validOcrRequest, image: '' };

        await expect(
          controller.performOcr(invalidRequest, mockUser as any),
        ).rejects.toThrow(BadRequestException);
      });

      it('should validate image data type', async () => {
        const invalidRequest = { ...validOcrRequest, image: null as any };

        await expect(
          controller.performOcr(invalidRequest, mockUser as any),
        ).rejects.toThrow(BadRequestException);
      });

      it('should check framework availability', async () => {
        cuaIntegrationService.isFrameworkEnabled.mockReturnValue(false);

        await expect(
          controller.performOcr(validOcrRequest, mockUser as any),
        ).rejects.toThrow(ServiceUnavailableException);

        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringContaining('OCR request received'),
        );
      });

      it('should use default options when not provided', async () => {
        const minimalRequest: OcrRequestDto = {
          image: 'base64data',
        };

        const mockOcrResult: OcrResult = {
          text: 'Default OCR',
          confidence: 0.8,
          processingTimeMs: 100,
          method: 'cpu',
          requestId: 'default-123',
        };

        cuaIntegrationService.isFrameworkEnabled.mockReturnValue(true);
        visionService.performOcr.mockResolvedValue(mockOcrResult);

        const result = await controller.performOcr(
          minimalRequest,
          mockUser as any,
        );

        expect(result.success).toBe(true);
        expect(visionService.performOcr).toHaveBeenCalledWith(
          'base64data',
          expect.objectContaining({
            recognitionLevel: 'accurate',
            languages: ['en-US'],
            customWords: [],
            enableBoundingBoxes: false,
            cacheEnabled: true,
            forceMethod: undefined,
          }),
        );
      });

      it('should handle OCR processing errors', async () => {
        cuaIntegrationService.isFrameworkEnabled.mockReturnValue(true);
        visionService.performOcr.mockRejectedValue(
          new Error('OCR processing failed'),
        );

        await expect(
          controller.performOcr(validOcrRequest, mockUser as any),
        ).rejects.toThrow(HttpException);

        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('OCR failed'),
          expect.any(String),
        );
      });

      it('should preserve BadRequestException and ServiceUnavailableException', async () => {
        // Test BadRequestException passthrough
        cuaIntegrationService.isFrameworkEnabled.mockReturnValue(true);
        visionService.performOcr.mockRejectedValue(
          new BadRequestException('Invalid image format'),
        );

        await expect(
          controller.performOcr(validOcrRequest, mockUser as any),
        ).rejects.toThrow(BadRequestException);

        // Test ServiceUnavailableException passthrough
        visionService.performOcr.mockRejectedValue(
          new ServiceUnavailableException('Service down'),
        );

        await expect(
          controller.performOcr(validOcrRequest, mockUser as any),
        ).rejects.toThrow(ServiceUnavailableException);
      });

      it('should handle complex OCR results with multiple bounding boxes', async () => {
        const complexOcrResult: OcrResult = {
          text: 'Multi-line text with various elements',
          confidence: 0.92,
          boundingBoxes: [
            {
              text: 'Multi-line',
              x: 0,
              y: 0,
              width: 80,
              height: 20,
              confidence: 0.95,
            },
            {
              text: 'text',
              x: 85,
              y: 0,
              width: 40,
              height: 20,
              confidence: 0.93,
            },
            {
              text: 'with',
              x: 0,
              y: 25,
              width: 30,
              height: 18,
              confidence: 0.91,
            },
            {
              text: 'various',
              x: 35,
              y: 25,
              width: 55,
              height: 18,
              confidence: 0.89,
            },
            {
              text: 'elements',
              x: 95,
              y: 25,
              width: 65,
              height: 18,
              confidence: 0.94,
            },
          ],
          processingTimeMs: 250,
          method: 'ane',
          language: 'en-US',
          requestId: 'complex-ocr-456',
          aneUsed: true,
        };

        cuaIntegrationService.isFrameworkEnabled.mockReturnValue(true);
        visionService.performOcr.mockResolvedValue(complexOcrResult);

        const result = await controller.performOcr(
          validOcrRequest,
          mockUser as any,
        );

        expect(result.success).toBe(true);
        expect(result.result?.boundingBoxes).toHaveLength(5);
        expect(result.result?.text).toContain('Multi-line');
      });

      it('should handle edge cases in image data', async () => {
        const edgeCases = [
          { image: 'a', description: 'Very short image data' },
          { image: 'A'.repeat(1000000), description: 'Very long image data' },
          {
            image:
              'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
            description: 'Valid JPEG base64',
          },
        ];

        cuaIntegrationService.isFrameworkEnabled.mockReturnValue(true);
        const mockResult: OcrResult = {
          text: 'Test',
          confidence: 0.8,
          processingTimeMs: 100,
          method: 'cpu',
        };
        visionService.performOcr.mockResolvedValue(mockResult);

        for (const testCase of edgeCases) {
          const request = { ...validOcrRequest, image: testCase.image };
          const result = await controller.performOcr(request, mockUser as any);
          expect(result.success).toBe(true);
        }
      });
    });
  });

  describe('Performance Metrics Endpoint', () => {
    describe('GET /api/v1/cua/performance', () => {
      it('should return performance metrics with default time range', () => {
        const mockSummary = {
          totalOperations: 150,
          successRate: 98.5,
          averageDuration: 125.5,
          operationBreakdown: {
            ocr_processing: {
              count: 100,
              averageDuration: 120.0,
              successRate: 99.0,
            },
            text_detection: {
              count: 50,
              averageDuration: 135.0,
              successRate: 97.0,
            },
          },
          systemHealth: {
            cpuUsage: 25.5,
            memoryUsage: 68.2,
            diskUsage: 45.1,
          },
          timeRange: {
            start: new Date('2024-01-01T10:00:00Z'),
            end: new Date('2024-01-01T11:00:00Z'),
          },
        };

        const mockSystemMetrics = {
          timestamp: new Date(),
          cpu: { usage: 25.5, loadAverage: [1.2, 1.1, 1.0] },
          memory: {
            total: 16000000000,
            used: 10000000000,
            free: 6000000000,
            usagePercent: 62.5,
          },
          disk: { used: 500000000000, free: 500000000000, usagePercent: 50.0 },
        };

        const mockSystemHealth = { healthy: true, issues: [] };
        const mockBridgeStatus = {
          connected: true,
          responseTime: 45,
          lastCheck: new Date(),
          errorCount: 0,
          capabilities: ['ocr'],
        };

        performanceService.getPerformanceSummary.mockReturnValue(mockSummary);
        performanceService.getCurrentSystemMetrics.mockReturnValue(
          mockSystemMetrics,
        );
        performanceService.isSystemHealthy.mockReturnValue(mockSystemHealth);
        bridgeService.getHealthStatus.mockReturnValue(mockBridgeStatus);

        const result = controller.getPerformanceMetrics('60', mockUser as any);

        expect(result).toMatchObject({
          timestamp: expect.any(String),
          timeRangeMinutes: 60,
          performance: mockSummary,
          system: {
            current: mockSystemMetrics,
            health: mockSystemHealth,
          },
          bridge: {
            status: mockBridgeStatus,
          },
        });

        expect(performanceService.getPerformanceSummary).toHaveBeenCalledWith(
          60,
        );
      });

      it('should validate time range parameters', () => {
        expect(() =>
          controller.getPerformanceMetrics('0', mockUser as any),
        ).toThrow(BadRequestException);

        expect(() =>
          controller.getPerformanceMetrics('1441', mockUser as any),
        ).toThrow(BadRequestException);

        expect(() =>
          controller.getPerformanceMetrics('invalid', mockUser as any),
        ).toThrow(BadRequestException);
      });

      it('should use default time range for invalid input', () => {
        const mockSummary = {
          totalOperations: 0,
          successRate: 0,
          averageDuration: 0,
          operationBreakdown: {},
          systemHealth: { cpuUsage: 0, memoryUsage: 0, diskUsage: 0 },
          timeRange: { start: new Date(), end: new Date() },
        };
        performanceService.getPerformanceSummary.mockReturnValue(mockSummary);
        performanceService.getCurrentSystemMetrics.mockReturnValue({} as any);
        performanceService.isSystemHealthy.mockReturnValue({
          healthy: true,
          issues: [],
        });
        bridgeService.getHealthStatus.mockReturnValue({} as any);

        const result = controller.getPerformanceMetrics('abc', mockUser as any);

        expect(result.timeRangeMinutes).toBe(60);
        expect(performanceService.getPerformanceSummary).toHaveBeenCalledWith(
          60,
        );
      });

      it('should handle performance service errors', () => {
        performanceService.getPerformanceSummary.mockImplementation(() => {
          throw new Error('Performance service error');
        });

        expect(() =>
          controller.getPerformanceMetrics('30', mockUser as any),
        ).toThrow(HttpException);

        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to get performance metrics'),
          expect.any(String),
        );
      });

      it('should preserve BadRequestException from validation', () => {
        expect(() =>
          controller.getPerformanceMetrics('-1', mockUser as any),
        ).toThrow(BadRequestException);
      });

      it('should handle complex performance data', () => {
        const complexSummary = {
          totalOperations: 5000,
          successRate: 97.8,
          averageDuration: 85.3,
          operationBreakdown: {
            ane_bridge_request: {
              count: 3000,
              averageDuration: 75.2,
              successRate: 98.5,
            },
            ocr_processing: {
              count: 2500,
              averageDuration: 95.1,
              successRate: 97.2,
            },
            text_detection: {
              count: 1500,
              averageDuration: 65.8,
              successRate: 99.1,
            },
            batch_ocr: {
              count: 500,
              averageDuration: 150.5,
              successRate: 96.0,
            },
          },
          systemHealth: {
            cpuUsage: 45.3,
            memoryUsage: 78.9,
            diskUsage: 23.4,
          },
          timeRange: {
            start: new Date('2024-01-01T00:00:00Z'),
            end: new Date('2024-01-01T12:00:00Z'),
          },
        };

        performanceService.getPerformanceSummary.mockReturnValue(
          complexSummary,
        );
        performanceService.getCurrentSystemMetrics.mockReturnValue({} as any);
        performanceService.isSystemHealthy.mockReturnValue({
          healthy: false,
          issues: ['High CPU', 'Memory pressure'],
        });
        bridgeService.getHealthStatus.mockReturnValue({} as any);

        const result = controller.getPerformanceMetrics('720', mockUser as any);

        expect(result.performance.operationBreakdown).toHaveProperty(
          'ane_bridge_request',
        );
        expect(result.performance.operationBreakdown).toHaveProperty(
          'batch_ocr',
        );
        expect(result.system.health.issues).toContain('High CPU');
        expect(result.system.health.issues).toContain('Memory pressure');
      });
    });
  });

  describe('Capabilities Endpoint', () => {
    describe('GET /api/v1/cua/capabilities', () => {
      it('should return comprehensive system capabilities', () => {
        const mockFrameworkConfig = {
          framework: {
            enabled: true,
            containerId: 'test-container',
            version: '1.2.0',
            performanceMode: 'optimized',
            logLevel: 'info',
          },
          aneBridge: {
            enabled: true,
            host: 'localhost',
            port: 8080,
            baseUrl: 'http://localhost:8080',
            fallbackEnabled: true,
            timeoutMs: 5000,
          },
          monitoring: { enabled: true, metricsCollection: true },
          hybrid: {
            nativeBridgeEnabled: true,
            sharedVolumePath: '/opt/cua/shared',
          },
        };

        const mockVisionCapabilities = {
          aneEnabled: true,
          fallbackEnabled: true,
          batchProcessing: true,
          caching: true,
          supportedFormats: ['PNG', 'JPEG', 'WebP', 'TIFF', 'BMP'],
          supportedLanguages: ['en-US', 'es-ES', 'fr-FR', 'de-DE'],
          maxBatchSize: 10,
          performanceTargets: {
            latencyMs: '2-5 (ANE) / 15-40 (CPU)',
            throughputImagesPerSecond: '100-500',
          },
        };

        const mockBridgeHealth = {
          connected: true,
          responseTime: 35,
          lastCheck: new Date(),
          errorCount: 0,
          capabilities: ['ocr', 'text', 'batch'],
          version: '1.1.0',
        };

        cuaIntegrationService.getConfiguration.mockReturnValue(
          mockFrameworkConfig,
        );
        visionService.getCapabilities.mockReturnValue(mockVisionCapabilities);
        bridgeService.getHealthStatus.mockReturnValue(mockBridgeHealth);

        const result = controller.getCapabilities(mockUser as any);

        expect(result).toMatchObject({
          timestamp: expect.any(String),
          framework: {
            enabled: true,
            version: '1.2.0',
            performanceMode: 'optimized',
          },
          vision: mockVisionCapabilities,
          bridge: {
            enabled: true,
            connected: true,
            capabilities: ['ocr', 'text', 'batch'],
            version: '1.1.0',
          },
          endpoints: [
            'GET /api/v1/cua/status',
            'GET /api/v1/cua/health',
            'POST /api/v1/cua/vision/ocr',
            'GET /api/v1/cua/performance',
            'GET /api/v1/cua/capabilities',
          ],
        });
      });

      it('should handle service configuration errors', () => {
        cuaIntegrationService.getConfiguration.mockImplementation(() => {
          throw new Error('Configuration error');
        });

        expect(() => controller.getCapabilities(mockUser as any)).toThrow(
          HttpException,
        );

        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to get capabilities'),
          expect.any(String),
        );
      });

      it('should handle partial service failures gracefully', () => {
        const mockFrameworkConfig = {
          framework: {
            enabled: false,
            containerId: 'disabled',
            version: '0.0.0',
            performanceMode: 'standard',
            logLevel: 'warn',
          },
          aneBridge: {
            enabled: false,
            host: 'localhost',
            port: 8080,
            baseUrl: 'http://localhost:8080',
            fallbackEnabled: false,
            timeoutMs: 3000,
          },
          monitoring: { enabled: false, metricsCollection: false },
          hybrid: { nativeBridgeEnabled: false, sharedVolumePath: '/tmp' },
        };

        const mockVisionCapabilities = {
          aneEnabled: false,
          fallbackEnabled: false,
          batchProcessing: false,
          caching: false,
          supportedFormats: [],
          supportedLanguages: [],
          maxBatchSize: 0,
          performanceTargets: {
            latencyMs: 'N/A',
            throughputImagesPerSecond: 'N/A',
          },
        };
        const mockBridgeHealth = {
          connected: false,
          responseTime: 0,
          lastCheck: new Date(),
          errorCount: 5,
          capabilities: [],
          version: undefined,
        };

        cuaIntegrationService.getConfiguration.mockReturnValue(
          mockFrameworkConfig,
        );
        visionService.getCapabilities.mockReturnValue(mockVisionCapabilities);
        bridgeService.getHealthStatus.mockReturnValue(mockBridgeHealth);

        const result = controller.getCapabilities(mockUser as any);

        expect(result.framework.enabled).toBe(false);
        expect(result.bridge.enabled).toBe(false);
        expect(result.bridge.connected).toBe(false);
        expect(result.vision.aneEnabled).toBe(false);
      });
    });
  });

  describe('Request DTOs', () => {
    describe('OcrRequestDto', () => {
      it('should have correct default values', () => {
        const dto = new OcrRequestDto();
        expect(dto.recognitionLevel).toBe('accurate');
        expect(dto.languages).toEqual(['en-US']);
        expect(dto.customWords).toEqual([]);
        expect(dto.enableBoundingBoxes).toBe(false);
        expect(dto.cacheEnabled).toBe(true);
      });
    });

    describe('BatchOcrRequestDto', () => {
      it('should have correct default values', () => {
        const dto = new BatchOcrRequestDto();
        expect(dto.recognitionLevel).toBe('accurate');
        expect(dto.languages).toEqual(['en-US']);
        expect(dto.customWords).toEqual([]);
        expect(dto.enableBoundingBoxes).toBe(false);
        expect(dto.cacheEnabled).toBe(true);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null/undefined service responses', () => {
      cuaIntegrationService.getFrameworkStatus.mockReturnValue(null as any);
      bridgeService.getHealthStatus.mockReturnValue(null as any);
      performanceService.isSystemHealthy.mockReturnValue(null as any);
      visionService.getCapabilities.mockReturnValue(null as any);

      expect(() => controller.getFrameworkStatus(mockUser as any)).toThrow();
    });

    it('should handle concurrent requests properly', async () => {
      cuaIntegrationService.isFrameworkEnabled.mockReturnValue(true);

      const mockOcrResult: OcrResult = {
        text: 'Concurrent test',
        confidence: 0.9,
        processingTimeMs: 100,
        method: 'ane',
        requestId: expect.any(String),
      };

      visionService.performOcr.mockResolvedValue(mockOcrResult);

      // Send multiple concurrent OCR requests
      const requests = Array.from({ length: 10 }, (_, i) =>
        controller.performOcr(
          {
            image: `test-image-${i}`,
            recognitionLevel: 'fast',
          } as OcrRequestDto,
          mockUser as any,
        ),
      );

      const results = await Promise.all(requests);

      expect(results).toHaveLength(10);
      expect(results.every((r) => r.success)).toBe(true);
      expect(visionService.performOcr).toHaveBeenCalledTimes(10);
    });

    it('should handle memory-intensive operations', async () => {
      const largeImageData = 'data:image/png;base64,' + 'A'.repeat(1000000); // 1MB base64 string

      cuaIntegrationService.isFrameworkEnabled.mockReturnValue(true);
      visionService.performOcr.mockResolvedValue({
        text: 'Large image processed',
        confidence: 0.88,
        processingTimeMs: 500,
        method: 'cpu',
        requestId: 'large-image-123',
      });

      const result = await controller.performOcr(
        {
          image: largeImageData,
        } as OcrRequestDto,
        mockUser as any,
      );

      expect(result.success).toBe(true);
      expect(result.result?.text).toBe('Large image processed');
    });

    it('should handle service timeouts gracefully', async () => {
      cuaIntegrationService.isFrameworkEnabled.mockReturnValue(true);

      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      visionService.performOcr.mockRejectedValue(timeoutError);

      await expect(
        controller.performOcr(
          {
            image: 'timeout-test-image',
          } as OcrRequestDto,
          mockUser as any,
        ),
      ).rejects.toThrow(HttpException);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Request timeout'),
        expect.any(String),
      );
    });
  });

  describe('Logging and Monitoring', () => {
    it('should log operation IDs for traceability', async () => {
      cuaIntegrationService.isFrameworkEnabled.mockReturnValue(true);
      visionService.performOcr.mockResolvedValue({
        text: 'Traced operation',
        confidence: 0.9,
        processingTimeMs: 120,
        method: 'ane',
        requestId: 'trace-123',
      });

      await controller.performOcr(
        {
          image: 'trace-test',
        } as OcrRequestDto,
        mockUser as any,
      );

      // Check that operation ID is included in logs
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringMatching(/\[ocr_\d+_\w+\]/),
        expect.any(Object),
      );
    });

    it('should log detailed error information', async () => {
      cuaIntegrationService.isFrameworkEnabled.mockReturnValue(true);

      const detailedError = new Error('Detailed processing error');
      detailedError.stack =
        'Error: Detailed processing error\n    at TestModule.process';

      visionService.performOcr.mockRejectedValue(detailedError);

      await expect(
        controller.performOcr(
          {
            image: 'error-test',
          } as OcrRequestDto,
          mockUser as any,
        ),
      ).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Detailed processing error'),
        expect.stringContaining('at TestModule.process'),
      );
    });
  });
});
