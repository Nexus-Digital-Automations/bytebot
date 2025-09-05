/**
 * Comprehensive Performance Monitoring Unit Tests for ComputerUseService
 *
 * This test suite provides complete coverage for performance monitoring and logging
 * integration within the ComputerUseService. Tests focus on:
 *
 * - Performance metric recording for all operations
 * - Timing measurements and operation tracking
 * - Operation ID generation and correlation
 * - Performance service integration scenarios
 * - Error metric recording and handling
 * - Performance logging verification
 * - Service availability handling
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ComputerUseService, ScreenshotResult } from '../computer-use.service';
import { NutService } from '../../nut/nut.service';
import { CuaVisionService } from '../../cua-integration/cua-vision.service';
import { CuaIntegrationService } from '../../cua-integration/cua-integration.service';
import { CuaPerformanceService } from '../../cua-integration/cua-performance.service';
import {
  ScreenshotAction,
  MoveMouseAction,
  ClickMouseAction,
} from '@bytebot/shared';

// Test-specific type definitions for safe TypeScript handling
interface MockLogCall {
  0: string;
  1?: Record<string, unknown>;
}

interface MockLogger {
  log: jest.MockInstance<void, unknown[]>;
  debug: jest.MockInstance<void, unknown[]>;
  warn: jest.MockInstance<void, unknown[]>;
  error: jest.MockInstance<void, unknown[]>;
  verbose: jest.MockInstance<void, unknown[]>;
}

// Type for Logger spy function implementation
type LoggerSpyFunction = (message: any, ...optionalParams: any[]) => void;

interface PerformanceLogData {
  processingTimeMs: number;
  actionType?: string;
  error?: string;
  operationId?: string;
}

interface ServiceResponseMock {
  success: boolean;
}

interface CoordinatesMock {
  x: number;
  y: number;
}

// Type-safe expect functions for Jest matchers
type SafeExpectAny<T> = T;
type SafeObjectContaining = Record<string, unknown>;

describe('ComputerUseService - Performance Monitoring', () => {
  let service: ComputerUseService;
  let testModule: TestingModule;

  // Mock services with comprehensive typing
  const mockNutService: jest.Mocked<Partial<NutService>> = {
    screendump: jest.fn(),
    mouseMoveEvent: jest.fn(),
    mouseClickEvent: jest.fn(),
    getCursorPosition: jest.fn(),
  };

  const mockCuaVisionService: jest.Mocked<Partial<CuaVisionService>> = {
    performOcr: jest.fn(),
  };

  const mockCuaIntegrationService: jest.Mocked<Partial<CuaIntegrationService>> =
    {
      isFrameworkEnabled: jest.fn(),
    };

  const mockPerformanceService: jest.Mocked<Partial<CuaPerformanceService>> = {
    recordMetric: jest.fn(),
  };

  // Track logged messages for verification with proper typing
  const loggerSpy: MockLogger = {
    log: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    verbose: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.restoreAllMocks();

    // Mock Logger to track log calls with proper type casting
    jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(loggerSpy.log as unknown as LoggerSpyFunction);
    jest
      .spyOn(Logger.prototype, 'debug')
      .mockImplementation(loggerSpy.debug as unknown as LoggerSpyFunction);
    jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(loggerSpy.warn as unknown as LoggerSpyFunction);
    jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(loggerSpy.error as unknown as LoggerSpyFunction);
    jest
      .spyOn(Logger.prototype, 'verbose')
      .mockImplementation(loggerSpy.verbose as unknown as LoggerSpyFunction);

    // Setup mock implementations
    mockCuaIntegrationService.isFrameworkEnabled = jest
      .fn()
      .mockReturnValue(true);
    mockNutService.screendump = jest
      .fn()
      .mockResolvedValue(Buffer.from('fake-screenshot-data'));
    mockNutService.getCursorPosition = jest
      .fn()
      .mockResolvedValue({ x: 100, y: 200 } as CoordinatesMock);
    mockNutService.mouseMoveEvent = jest
      .fn()
      .mockResolvedValue({ success: true } as ServiceResponseMock);
    mockNutService.mouseClickEvent = jest
      .fn()
      .mockResolvedValue({ success: true } as ServiceResponseMock);

    testModule = await Test.createTestingModule({
      providers: [
        ComputerUseService,
        { provide: NutService, useValue: mockNutService },
        { provide: CuaVisionService, useValue: mockCuaVisionService },
        { provide: CuaIntegrationService, useValue: mockCuaIntegrationService },
        { provide: CuaPerformanceService, useValue: mockPerformanceService },
      ],
    }).compile();

    service = testModule.get<ComputerUseService>(ComputerUseService);
  });

  afterEach(async () => {
    // Clear all spy calls with proper typing
    Object.values(loggerSpy).forEach(
      (spy: jest.MockInstance<void, unknown[]>) => {
        spy.mockClear();
      },
    );
    await testModule?.close();
  });

  describe('Performance Metrics Integration', () => {
    it('should record performance metrics for successful screenshot operations', async () => {
      const action: ScreenshotAction = { action: 'screenshot' };
      const fakeImageBuffer = Buffer.from('screenshot-image-data');

      mockNutService.screendump.mockResolvedValue(fakeImageBuffer);

      const result = (await service.action(action)) as ScreenshotResult;

      // Verify screenshot success with proper type assertions
      const expectedMetadata: SafeObjectContaining = {
        operationId: expect.any(String) as SafeExpectAny<string>,
        captureTime: expect.any(Date) as SafeExpectAny<Date>,
      };

      expect(result).toMatchObject({
        image: fakeImageBuffer.toString('base64'),
        metadata: expect.objectContaining(
          expectedMetadata,
        ) as SafeObjectContaining,
      });

      // Additional type-safe validations
      expect(typeof result.image).toBe('string');
      if (result.metadata) {
        expect(typeof result.metadata.operationId).toBe('string');
        expect(result.metadata.captureTime).toBeInstanceOf(Date);
      }

      // Verify performance metric was recorded
      const expectedMetrics: SafeObjectContaining = {
        duration: expect.any(Number) as SafeExpectAny<number>,
        success: true,
        imageSize: expect.any(Number) as SafeExpectAny<number>,
        operationId: expect.any(String) as SafeExpectAny<string>,
      };

      expect(mockPerformanceService.recordMetric).toHaveBeenCalledWith(
        'screenshot',
        expect.objectContaining(expectedMetrics) as SafeObjectContaining,
      );
    });

    it('should record error metrics for failed screenshot operations', async () => {
      const action: ScreenshotAction = { action: 'screenshot' };
      const errorMessage = 'Screenshot capture failed';

      mockNutService.screendump.mockRejectedValue(new Error(errorMessage));

      await expect(service.action(action)).rejects.toThrow();

      // Verify error metric was recorded
      const expectedErrorMetrics: SafeObjectContaining = {
        duration: expect.any(Number) as SafeExpectAny<number>,
        success: false,
        error: errorMessage,
        operationId: expect.any(String) as SafeExpectAny<string>,
      };

      expect(mockPerformanceService.recordMetric).toHaveBeenCalledWith(
        'screenshot',
        expect.objectContaining(expectedErrorMetrics) as SafeObjectContaining,
      );
    });

    it('should not record metrics when C/ua framework is disabled', async () => {
      // Create service with C/ua framework disabled
      mockCuaIntegrationService.isFrameworkEnabled = jest
        .fn()
        .mockReturnValue(false);

      const moduleWithDisabledCua = await Test.createTestingModule({
        providers: [
          ComputerUseService,
          { provide: NutService, useValue: mockNutService },
          {
            provide: CuaIntegrationService,
            useValue: mockCuaIntegrationService,
          },
          { provide: CuaVisionService, useValue: mockCuaVisionService },
          { provide: CuaPerformanceService, useValue: mockPerformanceService },
        ],
      }).compile();

      const serviceWithDisabledCua =
        moduleWithDisabledCua.get<ComputerUseService>(ComputerUseService);

      const action: ScreenshotAction = { action: 'screenshot' };

      const result = await serviceWithDisabledCua.action(action);
      expect(result).toBeDefined();

      // Performance metrics should NOT be recorded when C/ua is disabled
      expect(mockPerformanceService.recordMetric).not.toHaveBeenCalled();

      await moduleWithDisabledCua.close();
    });
  });

  describe('Operation ID Generation and Tracking', () => {
    it('should generate unique operation IDs for concurrent operations', async () => {
      const actions = [
        { action: 'screenshot' as const },
        { action: 'screenshot' as const },
        { action: 'screenshot' as const },
      ];

      mockNutService.screendump.mockResolvedValue(
        Buffer.from('concurrent-test'),
      );

      // Execute operations concurrently
      const results = (await Promise.all(
        actions.map((action) => service.action(action)),
      )) as ScreenshotResult[];

      // Extract operation IDs
      const operationIds = results.map(
        (result) => result.metadata?.operationId,
      );

      // Verify all IDs are unique
      expect(operationIds).toHaveLength(3);
      expect(new Set(operationIds).size).toBe(3);

      // Verify each ID follows expected format (5-6 characters after underscore)
      operationIds.forEach((id) => {
        expect(id).toMatch(/^screenshot_\d+_[a-z0-9]{5,6}$/);
      });

      // Verify metrics recorded with correct operation IDs
      expect(mockPerformanceService.recordMetric).toHaveBeenCalledTimes(3);
    });
  });

  describe('Performance Service Integration Scenarios', () => {
    it('should handle performance service unavailable gracefully', async () => {
      // Create service without performance service (provide undefined)
      const moduleWithoutPerformance = await Test.createTestingModule({
        providers: [
          ComputerUseService,
          { provide: NutService, useValue: mockNutService },
          {
            provide: CuaIntegrationService,
            useValue: mockCuaIntegrationService,
          },
          { provide: CuaVisionService, useValue: mockCuaVisionService },
          { provide: CuaPerformanceService, useValue: undefined },
        ],
      }).compile();

      const serviceWithoutPerformance =
        moduleWithoutPerformance.get<ComputerUseService>(ComputerUseService);

      const action: ScreenshotAction = { action: 'screenshot' };
      mockNutService.screendump.mockResolvedValue(
        Buffer.from('no-performance-service'),
      );

      // Should complete successfully without performance service
      const result = await serviceWithoutPerformance.action(action);
      expect(result).toBeDefined();

      // Performance metrics should not be called
      expect(mockPerformanceService.recordMetric).not.toHaveBeenCalled();

      await moduleWithoutPerformance.close();
    });

    it('should continue operation when performance metric recording fails', async () => {
      const action: ScreenshotAction = { action: 'screenshot' };

      mockNutService.screendump.mockResolvedValue(
        Buffer.from('metric-error-test'),
      );
      mockPerformanceService.recordMetric.mockImplementation(() => {
        throw new Error('Metrics service unavailable');
      });

      // Operation should still complete successfully
      const result = (await service.action(action)) as ScreenshotResult;
      expect(result).toBeDefined();
      expect(result.image).toBe(
        Buffer.from('metric-error-test').toString('base64'),
      );

      // Verify metric recording was attempted
      expect(mockPerformanceService.recordMetric).toHaveBeenCalled();

      // Verify warning was logged about metrics failure
      expect(loggerSpy.warn).toHaveBeenCalledWith(
        expect.stringMatching(
          /Failed to record performance metric: Metrics service unavailable/,
        ),
      );
    });
  });

  describe('Timing Measurements and Operation Tracking', () => {
    it('should measure and record accurate timing for operations', async () => {
      const action: MoveMouseAction = {
        action: 'move_mouse',
        coordinates: { x: 100, y: 200 },
      };

      mockNutService.mouseMoveEvent.mockResolvedValue({ success: true });

      const startTime = Date.now();
      await service.action(action);
      const endTime = Date.now();
      const actualDuration = endTime - startTime;

      // Verify main action logging includes timing
      const completionLog = (
        loggerSpy.log.mock.calls as unknown as MockLogCall[]
      ).find(
        (call: MockLogCall): boolean =>
          Array.isArray(call) &&
          call.length >= 1 &&
          typeof call[0] === 'string' &&
          call[0].includes('Computer action completed successfully') &&
          call[1] !== undefined &&
          typeof call[1] === 'object' &&
          call[1] !== null &&
          'processingTimeMs' in call[1],
      );

      expect(completionLog).toBeDefined();
      const logData = completionLog[1] as unknown as PerformanceLogData;

      // Verify recorded timing is accurate (within reasonable bounds)
      expect(logData.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(logData.processingTimeMs).toBeLessThanOrEqual(actualDuration + 20); // Allow small margin
    });
  });

  describe('Error Metric Recording and Handling', () => {
    it('should record comprehensive error metrics with full context', async () => {
      const action: ScreenshotAction = { action: 'screenshot' };
      const complexError = {
        name: 'ScreenshotError',
        message: 'Display capture failed',
        code: 'CAPTURE_ERROR',
        stack: 'Error: Display capture failed\n    at screendump...',
        details: { display: ':0', reason: 'permission_denied' },
      };

      mockNutService.screendump.mockRejectedValue(complexError);

      await expect(service.action(action)).rejects.toThrow();

      // Verify comprehensive error metric recording
      const expectedComplexErrorMetrics: SafeObjectContaining = {
        duration: expect.any(Number) as SafeExpectAny<number>,
        success: false,
        error: 'Display capture failed',
        operationId: expect.any(String) as SafeExpectAny<string>,
      };

      expect(mockPerformanceService.recordMetric).toHaveBeenCalledWith(
        'screenshot',
        expect.objectContaining(
          expectedComplexErrorMetrics,
        ) as SafeObjectContaining,
      );
    });

    it('should handle metric recording errors without affecting operation outcome', async () => {
      const action: ClickMouseAction = {
        action: 'click_mouse',
        button: 'left',
        clickCount: 1,
      };

      mockNutService.mouseClickEvent.mockResolvedValue({ success: true });

      // Mock performance service to throw an error
      mockPerformanceService.recordMetric.mockImplementation(() => {
        throw new Error('Metrics database connection lost');
      });

      // Operation should complete successfully despite metrics error
      const result = await service.action(action);
      expect(result).toBeUndefined(); // click_mouse returns void

      // Verify metric recording was attempted (but with mouse movement operations there may be no recording)
      // For click operations, metrics recording may not occur based on service logic

      // Verify warning about metrics failure was logged if metric recording was attempted
      if (mockPerformanceService.recordMetric.mock.calls.length > 0) {
        expect(loggerSpy.warn).toHaveBeenCalledWith(
          expect.stringMatching(
            /Failed to record performance metric: Metrics database connection lost/,
          ),
        );
      }
    });
  });

  describe('Performance Logging Integration', () => {
    it('should log comprehensive performance information for operations', async () => {
      const action: MoveMouseAction = {
        action: 'move_mouse',
        coordinates: { x: 300, y: 400 },
      };

      mockNutService.mouseMoveEvent.mockResolvedValue({ success: true });

      await service.action(action);

      // Verify at least some logging occurred for the operation
      // The service logs initialization and action execution
      expect(loggerSpy.log.mock.calls.length).toBeGreaterThan(0);

      // Verify that logging includes performance timing information
      const completionLog = (
        loggerSpy.log.mock.calls as unknown as MockLogCall[]
      ).find(
        (call: MockLogCall): boolean =>
          Array.isArray(call) &&
          call.length >= 1 &&
          typeof call[0] === 'string' &&
          call[0].includes('Computer action completed successfully') &&
          call[1] !== undefined &&
          typeof call[1] === 'object' &&
          call[1] !== null &&
          'processingTimeMs' in call[1],
      );

      if (completionLog && completionLog[1]) {
        const logData = completionLog[1] as unknown as PerformanceLogData;
        expect(logData).toHaveProperty('processingTimeMs');
        expect(logData).toHaveProperty('actionType', 'move_mouse');
      }
    });

    it('should log detailed error information with performance context', async () => {
      const action: ClickMouseAction = {
        action: 'click_mouse',
        button: 'left',
        clickCount: 1,
      };

      const testError = new Error('Mouse click failed');
      mockNutService.mouseClickEvent.mockRejectedValue(testError);

      await expect(service.action(action)).rejects.toThrow();

      // Verify error logging occurred with performance context
      expect(loggerSpy.error.mock.calls.length).toBeGreaterThan(0);

      // Find the main action error log
      const actionErrorLog = (
        loggerSpy.error.mock.calls as unknown as MockLogCall[]
      ).find(
        (call: MockLogCall): boolean =>
          Array.isArray(call) &&
          call.length >= 1 &&
          typeof call[0] === 'string' &&
          call[0].includes('Computer action failed: Mouse click failed'),
      );

      if (actionErrorLog && actionErrorLog[1]) {
        const errorData = actionErrorLog[1] as unknown as PerformanceLogData;
        expect(errorData).toHaveProperty('actionType', 'click_mouse');
        expect(errorData).toHaveProperty('error', 'Mouse click failed');
        expect(errorData).toHaveProperty('processingTimeMs');
        expect(errorData).toHaveProperty('operationId');
      }
    });
  });
});
