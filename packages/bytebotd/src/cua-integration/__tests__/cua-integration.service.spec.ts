/**
 * CUA Integration Service Tests
 *
 * Comprehensive test suite for CuaIntegrationService covering:
 * - Framework initialization and lifecycle management
 * - Configuration management and validation
 * - Service connectivity testing
 * - Health monitoring and status management
 * - Hybrid architecture coordination
 * - Error handling and recovery
 * - ANE bridge status management
 * - Shared status file management
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import {
  CuaIntegrationService,
  CuaFrameworkStatus,
  CuaIntegrationConfig,
  ErrorHandler,
} from '../cua-integration.service';

// Mock fs promises
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(),
  },
}));

// Mock implementations
const mockHttpService = {
  get: jest.fn(),
  post: jest.fn(),
  request: jest.fn(),
};

const mockLogger = {
  log: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('CuaIntegrationService', () => {
  let service: CuaIntegrationService;
  let httpService: jest.Mocked<HttpService>;
  let mockFs: jest.Mocked<typeof fs.promises>;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.resetAllMocks();
    jest.useFakeTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CuaIntegrationService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    })
      .setLogger(mockLogger as any)
      .compile();

    service = module.get<CuaIntegrationService>(CuaIntegrationService);
    httpService = module.get(HttpService);
    mockFs = fs.promises as jest.Mocked<typeof fs.promises>;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllTimers();
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
    });
  });

  describe('Constructor and Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(CuaIntegrationService);
    });

    it('should initialize with default configuration', () => {
      const config = service.getConfiguration();
      expect(config).toMatchObject({
        framework: {
          enabled: false,
          containerId: 'unknown',
          version: '1.0.0',
          performanceMode: 'standard',
          logLevel: 'info',
        },
        aneBridge: {
          enabled: false,
          host: 'localhost',
          port: 8080,
          baseUrl: 'http://localhost:8080',
          fallbackEnabled: true,
          timeoutMs: 5000,
        },
        monitoring: {
          enabled: false,
          metricsCollection: false,
        },
        hybrid: {
          nativeBridgeEnabled: false,
          sharedVolumePath: '/tmp',
        },
      });
    });

    it('should initialize with default framework status', () => {
      const status = service.getFrameworkStatus();
      expect(status).toMatchObject({
        enabled: false,
        containerId: 'unknown',
        version: '1.0.0',
        performanceMode: 'standard',
        servicesRunning: [],
        aneBridgeStatus: 'disabled',
        hybridArchitectureActive: false,
      });
      expect(status.lastHealthCheck).toBeInstanceOf(Date);
    });

    it('should log initialization message', () => {
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'C/ua Integration Service initialized with config',
        ),
      );
    });
  });

  describe('Module Lifecycle', () => {
    describe('onModuleInit', () => {
      it('should skip initialization when framework is disabled', async () => {
        await service.onModuleInit();
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'C/ua Framework is disabled - skipping initialization',
        );
      });

      it('should perform full initialization when framework is enabled', async () => {
        // Enable framework
        (service as any).frameworkStatus.enabled = true;
        (service as any).config.framework.enabled = true;
        (service as any).config.aneBridge.enabled = true;
        (service as any).config.monitoring.enabled = true;

        // Mock successful service connectivity tests
        httpService.get.mockReturnValue(
          of({
            data: {},
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {} as any,
          }),
        );

        // Mock successful health check for ANE bridge
        httpService.get.mockReturnValue(
          of({
            data: { capabilities: ['ocr'], version: '1.0.0' },
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {} as any,
          }),
        );

        await service.onModuleInit();

        expect(mockLogger.log).toHaveBeenCalledWith(
          'Initializing C/ua Framework Integration',
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          'C/ua Framework Integration initialized successfully',
        );
      });

      it('should handle initialization errors gracefully', async () => {
        (service as any).frameworkStatus.enabled = true;
        (service as any).config.framework.enabled = true;

        // Mock service failure
        httpService.get.mockReturnValue(
          throwError(() => new Error('Service unavailable')),
        );

        await service.onModuleInit();

        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to initialize C/ua Framework'),
          expect.any(String),
        );
        expect(service.getFrameworkStatus().aneBridgeStatus).toBe('error');
      });

      it('should set up health monitoring when enabled', async () => {
        (service as any).frameworkStatus.enabled = true;
        (service as any).config.monitoring.enabled = true;

        const setIntervalSpy = jest.spyOn(global, 'setInterval');

        await service.onModuleInit();

        expect(setIntervalSpy).toHaveBeenCalled();
      });
    });

    describe('onModuleDestroy', () => {
      it('should clear health check interval', async () => {
        const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

        // Set up interval
        (service as any).healthCheckInterval = setInterval(() => {}, 1000);

        await service.onModuleDestroy();

        expect(clearIntervalSpy).toHaveBeenCalled();
        expect(mockLogger.log).toHaveBeenCalledWith(
          'C/ua Framework Integration shut down complete',
        );
      });

      it('should update shared status to indicate shutdown', async () => {
        (service as any).config.hybrid.sharedVolumePath = '/test/path';

        await service.onModuleDestroy();

        expect(mockFs.writeFile).toHaveBeenCalledWith(
          expect.stringContaining('bytebotd-status.json'),
          expect.stringContaining('shutting_down'),
        );
      });

      it('should handle shared status update errors during shutdown', async () => {
        (service as any).config.hybrid.sharedVolumePath = '/test/path';
        mockFs.writeFile.mockRejectedValue(new Error('Write failed'));

        await service.onModuleDestroy();

        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Failed to update shutdown status'),
        );
      });
    });
  });

  describe('Framework Status Management', () => {
    describe('getFrameworkStatus', () => {
      it('should return a copy of current framework status', () => {
        const status1 = service.getFrameworkStatus();
        const status2 = service.getFrameworkStatus();

        expect(status1).toEqual(status2);
        expect(status1).not.toBe(status2); // Different objects
      });

      it('should reflect current status values', () => {
        // Update internal status
        (service as any).frameworkStatus.enabled = true;
        (service as any).frameworkStatus.aneBridgeStatus = 'connected';
        (service as any).frameworkStatus.servicesRunning = ['CUA_Agent_API'];

        const status = service.getFrameworkStatus();
        expect(status.enabled).toBe(true);
        expect(status.aneBridgeStatus).toBe('connected');
        expect(status.servicesRunning).toEqual(['CUA_Agent_API']);
      });
    });

    describe('isFrameworkEnabled', () => {
      it('should return false when framework is disabled', () => {
        expect(service.isFrameworkEnabled()).toBe(false);
      });

      it('should return false when framework is enabled but no services running', () => {
        (service as any).frameworkStatus.enabled = true;
        (service as any).frameworkStatus.servicesRunning = [];

        expect(service.isFrameworkEnabled()).toBe(false);
      });

      it('should return true when framework is enabled and services are running', () => {
        (service as any).frameworkStatus.enabled = true;
        (service as any).frameworkStatus.servicesRunning = ['CUA_Agent_API'];

        expect(service.isFrameworkEnabled()).toBe(true);
      });
    });

    describe('isAneBridgeAvailable', () => {
      it('should return false when bridge status is not connected', () => {
        (service as any).frameworkStatus.aneBridgeStatus = 'disabled';
        expect(service.isAneBridgeAvailable()).toBe(false);

        (service as any).frameworkStatus.aneBridgeStatus = 'fallback';
        expect(service.isAneBridgeAvailable()).toBe(false);

        (service as any).frameworkStatus.aneBridgeStatus = 'error';
        expect(service.isAneBridgeAvailable()).toBe(false);
      });

      it('should return true when bridge status is connected', () => {
        (service as any).frameworkStatus.aneBridgeStatus = 'connected';
        expect(service.isAneBridgeAvailable()).toBe(true);
      });
    });
  });

  describe('Service Connectivity Testing', () => {
    describe('testServiceConnectivity', () => {
      it('should return true for successful connection', async () => {
        const mockResponse: AxiosResponse = {
          data: {},
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };
        httpService.get.mockReturnValue(of(mockResponse));

        const result = await service.testServiceConnectivity(
          'TestService',
          'http://test.com',
          3000,
        );

        expect(result).toBe(true);
        expect(httpService.get).toHaveBeenCalledWith('http://test.com', {
          timeout: 3000,
          validateStatus: expect.any(Function),
        });
        expect(mockLogger.debug).toHaveBeenCalledWith(
          expect.stringContaining('✓ TestService is accessible'),
        );
      });

      it('should return false for connection failure', async () => {
        httpService.get.mockReturnValue(
          throwError(() => new Error('Connection failed')),
        );

        const result = await service.testServiceConnectivity(
          'TestService',
          'http://test.com',
        );

        expect(result).toBe(false);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          expect.stringContaining('✗ TestService is not accessible'),
        );
      });

      it('should accept 4xx status codes as connected', async () => {
        const mockResponse: AxiosResponse = {
          data: {},
          status: 404,
          statusText: 'Not Found',
          headers: {},
          config: {} as any,
        };
        httpService.get.mockReturnValue(of(mockResponse));

        const result = await service.testServiceConnectivity(
          'TestService',
          'http://test.com',
        );

        expect(result).toBe(true);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          expect.stringContaining('✓ TestService is accessible (status: 404)'),
        );
      });

      it('should use default timeout when not specified', async () => {
        httpService.get.mockReturnValue(of({} as AxiosResponse));

        await service.testServiceConnectivity('TestService', 'http://test.com');

        expect(httpService.get).toHaveBeenCalledWith('http://test.com', {
          timeout: 5000,
          validateStatus: expect.any(Function),
        });
      });

      it('should handle various error types safely', async () => {
        const errorTypes = [
          new Error('Network error'),
          'String error',
          { message: 'Object error' },
          null,
          undefined,
        ];

        for (const error of errorTypes) {
          httpService.get.mockReturnValue(throwError(() => error));

          const result = await service.testServiceConnectivity(
            'TestService',
            'http://test.com',
          );

          expect(result).toBe(false);
        }
      });
    });
  });

  describe('Framework Component Initialization', () => {
    describe('initializeFramework (private method)', () => {
      it('should test essential services connectivity', async () => {
        // Mock successful connectivity tests
        httpService.get.mockReturnValue(
          of({
            data: {},
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {} as any,
          }),
        );

        await (service as any).initializeFramework();

        expect(httpService.get).toHaveBeenCalledWith(
          'http://localhost:9993/api/v1/health',
          expect.any(Object),
        );
        expect(httpService.get).toHaveBeenCalledWith(
          'http://localhost:9996/health',
          expect.any(Object),
        );

        const status = service.getFrameworkStatus();
        expect(status.servicesRunning).toEqual([
          'CUA_Agent_API',
          'WebSocket_Server',
        ]);
      });

      it('should handle partial service failures', async () => {
        // Mock first service success, second service failure
        httpService.get
          .mockReturnValueOnce(
            of({
              data: {},
              status: 200,
              statusText: 'OK',
              headers: {},
              config: {} as any,
            }),
          )
          .mockReturnValueOnce(throwError(() => new Error('Service down')));

        await (service as any).initializeFramework();

        const status = service.getFrameworkStatus();
        expect(status.servicesRunning).toEqual(['CUA_Agent_API']);
      });

      it('should update hybrid architecture status', async () => {
        (service as any).config.hybrid.nativeBridgeEnabled = true;

        await (service as any).initializeFramework();

        const status = service.getFrameworkStatus();
        expect(status.hybridArchitectureActive).toBe(true);
      });

      it('should log service status results', async () => {
        httpService.get.mockReturnValue(of({} as AxiosResponse));

        await (service as any).initializeFramework();

        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringContaining('Framework services status'),
        );
      });
    });
  });

  describe('ANE Bridge Connectivity', () => {
    describe('testAneBridgeConnectivity (private method)', () => {
      it('should set disabled status when bridge is disabled', async () => {
        (service as any).config.aneBridge.enabled = false;

        await (service as any).testAneBridgeConnectivity();

        expect(service.getFrameworkStatus().aneBridgeStatus).toBe('disabled');
      });

      it('should set connected status on successful connection', async () => {
        (service as any).config.aneBridge.enabled = true;

        httpService.get.mockReturnValue(
          of({
            data: {},
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {} as any,
          }),
        );

        await (service as any).testAneBridgeConnectivity();

        expect(service.getFrameworkStatus().aneBridgeStatus).toBe('connected');
        expect(mockLogger.log).toHaveBeenCalledWith(
          '✓ Apple Neural Engine bridge is connected',
        );
      });

      it('should set fallback status when connection fails but fallback is enabled', async () => {
        (service as any).config.aneBridge.enabled = true;
        (service as any).config.aneBridge.fallbackEnabled = true;

        httpService.get.mockReturnValue(
          throwError(() => new Error('Connection failed')),
        );

        await (service as any).testAneBridgeConnectivity();

        expect(service.getFrameworkStatus().aneBridgeStatus).toBe('fallback');
        expect(mockLogger.warn).toHaveBeenCalledWith(
          '⚠ ANE bridge unavailable - using fallback mode',
        );
      });

      it('should set error status when connection fails and fallback is disabled', async () => {
        (service as any).config.aneBridge.enabled = true;
        (service as any).config.aneBridge.fallbackEnabled = false;

        httpService.get.mockReturnValue(
          throwError(() => new Error('Connection failed')),
        );

        await (service as any).testAneBridgeConnectivity();

        expect(service.getFrameworkStatus().aneBridgeStatus).toBe('error');
        expect(mockLogger.error).toHaveBeenCalledWith(
          '✗ ANE bridge unavailable and fallback disabled',
        );
      });

      it('should use correct bridge health URL', async () => {
        (service as any).config.aneBridge.enabled = true;
        (service as any).config.aneBridge.baseUrl = 'http://custom:9000';
        (service as any).config.aneBridge.timeoutMs = 7500;

        httpService.get.mockReturnValue(of({} as AxiosResponse));

        await (service as any).testAneBridgeConnectivity();

        expect(httpService.get).toHaveBeenCalledWith(
          'http://custom:9000/health',
          expect.objectContaining({
            timeout: 7500,
          }),
        );
      });
    });
  });

  describe('Health Monitoring', () => {
    describe('startHealthMonitoring (private method)', () => {
      it('should skip when monitoring is disabled', () => {
        (service as any).config.monitoring.enabled = false;

        const setIntervalSpy = jest.spyOn(global, 'setInterval');

        (service as any).startHealthMonitoring();

        expect(setIntervalSpy).not.toHaveBeenCalled();
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Health monitoring is disabled',
        );
      });

      it('should start periodic health checks when monitoring is enabled', () => {
        (service as any).config.monitoring.enabled = true;

        const setIntervalSpy = jest.spyOn(global, 'setInterval');

        (service as any).startHealthMonitoring();

        expect(setIntervalSpy).toHaveBeenCalledWith(
          expect.any(Function),
          60000, // 60 seconds
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Starting C/ua health monitoring',
        );
      });

      it('should handle health check errors during monitoring', async () => {
        (service as any).config.monitoring.enabled = true;

        const performHealthCheckSpy = jest
          .spyOn(service as any, 'performHealthCheck')
          .mockRejectedValue(new Error('Health check failed'));

        (service as any).startHealthMonitoring();

        // Trigger interval
        jest.advanceTimersByTime(60000);
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Health check failed'),
        );
      });
    });

    describe('performHealthCheck (private method)', () => {
      it('should update last health check timestamp', async () => {
        const beforeTime = new Date();
        await (service as any).performHealthCheck();
        const afterTime = new Date();

        const status = service.getFrameworkStatus();
        expect(status.lastHealthCheck.getTime()).toBeGreaterThanOrEqual(
          beforeTime.getTime(),
        );
        expect(status.lastHealthCheck.getTime()).toBeLessThanOrEqual(
          afterTime.getTime(),
        );
      });

      it('should re-test ANE bridge when in error state and enabled', async () => {
        (service as any).frameworkStatus.aneBridgeStatus = 'error';
        (service as any).config.aneBridge.enabled = true;

        const testAneBridgeConnectivitySpy = jest
          .spyOn(service as any, 'testAneBridgeConnectivity')
          .mockResolvedValue(undefined);

        await (service as any).performHealthCheck();

        expect(testAneBridgeConnectivitySpy).toHaveBeenCalled();
      });

      it('should skip ANE bridge re-test when not in error state', async () => {
        (service as any).frameworkStatus.aneBridgeStatus = 'connected';
        (service as any).config.aneBridge.enabled = true;

        const testAneBridgeConnectivitySpy = jest
          .spyOn(service as any, 'testAneBridgeConnectivity')
          .mockResolvedValue(undefined);

        await (service as any).performHealthCheck();

        expect(testAneBridgeConnectivitySpy).not.toHaveBeenCalled();
      });

      it('should update shared status after health check', async () => {
        (service as any).config.hybrid.sharedVolumePath = '/test/path';

        const updateSharedStatusSpy = jest
          .spyOn(service as any, 'updateSharedStatus')
          .mockResolvedValue(undefined);

        await (service as any).performHealthCheck();

        expect(updateSharedStatusSpy).toHaveBeenCalled();
      });
    });
  });

  describe('Shared Status Management', () => {
    describe('updateSharedStatus (private method)', () => {
      it('should skip when shared volume path is not configured', async () => {
        (service as any).config.hybrid.sharedVolumePath = '';

        await (service as any).updateSharedStatus();

        expect(mockFs.writeFile).not.toHaveBeenCalled();
      });

      it('should write status file with correct data structure', async () => {
        (service as any).config.hybrid.sharedVolumePath = '/test/shared';
        (service as any).frameworkStatus = {
          enabled: true,
          containerId: 'test-container',
          version: '1.2.0',
          performanceMode: 'optimized',
          servicesRunning: ['CUA_Agent_API', 'WebSocket_Server'],
          lastHealthCheck: new Date('2024-01-01T12:00:00Z'),
          aneBridgeStatus: 'connected',
          hybridArchitectureActive: true,
        };

        await (service as any).updateSharedStatus('operational');

        expect(mockFs.writeFile).toHaveBeenCalledWith(
          '/test/shared/bytebotd-status.json',
          expect.stringContaining('"service":"bytebotd-cua-integration"'),
        );

        const writeCall = mockFs.writeFile.mock.calls[0];
        const statusData = JSON.parse(writeCall[1] as string);

        expect(statusData).toMatchObject({
          service: 'bytebotd-cua-integration',
          status: 'operational',
          framework: {
            enabled: true,
            containerId: 'test-container',
            version: '1.2.0',
            servicesRunning: ['CUA_Agent_API', 'WebSocket_Server'],
            aneBridgeStatus: 'connected',
            hybridArchitectureActive: true,
          },
        });
        expect(statusData.timestamp).toBeDefined();
        expect(statusData.lastHealthCheck).toBeDefined();
      });

      it('should handle file write errors gracefully', async () => {
        (service as any).config.hybrid.sharedVolumePath = '/test/shared';
        mockFs.writeFile.mockRejectedValue(new Error('Write failed'));

        await (service as any).updateSharedStatus();

        expect(mockLogger.debug).toHaveBeenCalledWith(
          expect.stringContaining('Failed to update shared status'),
        );
      });

      it('should use default status when not provided', async () => {
        (service as any).config.hybrid.sharedVolumePath = '/test/shared';

        await (service as any).updateSharedStatus();

        const writeCall = mockFs.writeFile.mock.calls[0];
        const statusData = JSON.parse(writeCall[1] as string);

        expect(statusData.status).toBe('operational');
      });

      it('should handle special status values', async () => {
        (service as any).config.hybrid.sharedVolumePath = '/test/shared';

        const specialStatuses = [
          'initializing',
          'degraded',
          'shutting_down',
          'error',
        ];

        for (const status of specialStatuses) {
          await (service as any).updateSharedStatus(status);

          const writeCall =
            mockFs.writeFile.mock.calls[mockFs.writeFile.mock.calls.length - 1];
          const statusData = JSON.parse(writeCall[1] as string);

          expect(statusData.status).toBe(status);
        }
      });
    });
  });

  describe('Configuration Management', () => {
    describe('getConfiguration', () => {
      it('should return a copy of current configuration', () => {
        const config1 = service.getConfiguration();
        const config2 = service.getConfiguration();

        expect(config1).toEqual(config2);
        expect(config1).not.toBe(config2); // Different objects
      });

      it('should return complete configuration structure', () => {
        const config = service.getConfiguration();

        expect(config).toHaveProperty('framework');
        expect(config).toHaveProperty('aneBridge');
        expect(config).toHaveProperty('monitoring');
        expect(config).toHaveProperty('hybrid');

        expect(config.framework).toHaveProperty('enabled');
        expect(config.framework).toHaveProperty('containerId');
        expect(config.framework).toHaveProperty('version');
        expect(config.framework).toHaveProperty('performanceMode');
        expect(config.framework).toHaveProperty('logLevel');

        expect(config.aneBridge).toHaveProperty('enabled');
        expect(config.aneBridge).toHaveProperty('host');
        expect(config.aneBridge).toHaveProperty('port');
        expect(config.aneBridge).toHaveProperty('baseUrl');
        expect(config.aneBridge).toHaveProperty('fallbackEnabled');
        expect(config.aneBridge).toHaveProperty('timeoutMs');

        expect(config.monitoring).toHaveProperty('enabled');
        expect(config.monitoring).toHaveProperty('metricsCollection');

        expect(config.hybrid).toHaveProperty('nativeBridgeEnabled');
        expect(config.hybrid).toHaveProperty('sharedVolumePath');
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle HTTP service failures during initialization', async () => {
      (service as any).frameworkStatus.enabled = true;
      (service as any).config.framework.enabled = true;

      // Mock HTTP service to throw
      httpService.get.mockImplementation(() => {
        throw new Error('HTTP service failure');
      });

      await service.onModuleInit();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize C/ua Framework'),
        expect.any(String),
      );
    });

    it('should handle malformed response data', async () => {
      (service as any).config.aneBridge.enabled = true;

      // Mock response with invalid data
      httpService.get.mockReturnValue(
        of({
          data: 'invalid json',
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        }),
      );

      await (service as any).testAneBridgeConnectivity();

      // Should not throw and should handle gracefully
      expect(service.getFrameworkStatus().aneBridgeStatus).toBe('connected');
    });

    it('should handle timeout errors specifically', async () => {
      const timeoutError = new Error('Timeout') as any;
      timeoutError.code = 'ECONNABORTED';

      httpService.get.mockReturnValue(throwError(() => timeoutError));

      const result = await service.testServiceConnectivity(
        'TimeoutService',
        'http://test.com',
      );

      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('TimeoutService is not accessible: Timeout'),
      );
    });

    it('should handle concurrent initialization calls', async () => {
      (service as any).frameworkStatus.enabled = true;
      (service as any).config.framework.enabled = true;

      httpService.get.mockReturnValue(of({} as AxiosResponse));

      // Call multiple times simultaneously
      const promises = [
        service.onModuleInit(),
        service.onModuleInit(),
        service.onModuleInit(),
      ];

      await Promise.all(promises);

      // Should not cause issues
      expect(mockLogger.log).toHaveBeenCalledWith(
        'C/ua Framework Integration initialized successfully',
      );
    });

    it('should handle memory pressure scenarios', async () => {
      // Test with large configuration objects
      (service as any).config.framework.containerId = 'x'.repeat(10000);
      (service as any).config.hybrid.sharedVolumePath =
        '/very/long/path/' + 'segment/'.repeat(100);

      const config = service.getConfiguration();
      const status = service.getFrameworkStatus();

      // Should not throw
      expect(config.framework.containerId).toBe('x'.repeat(10000));
      expect(status).toBeDefined();
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle rapid status updates', () => {
      // Rapidly update status multiple times
      for (let i = 0; i < 1000; i++) {
        (service as any).frameworkStatus.aneBridgeStatus =
          i % 2 === 0 ? 'connected' : 'fallback';
        (service as any).frameworkStatus.servicesRunning = [`service-${i}`];
      }

      const status = service.getFrameworkStatus();
      expect(status.aneBridgeStatus).toBe('fallback');
      expect(status.servicesRunning).toEqual(['service-999']);
    });

    it('should maintain configuration consistency', () => {
      // Get configuration multiple times and modify one
      const config1 = service.getConfiguration();
      const config2 = service.getConfiguration();

      config1.framework.enabled = !config1.framework.enabled;

      // config2 should be unchanged
      expect(config2.framework.enabled).not.toBe(config1.framework.enabled);
    });

    it('should handle service connectivity tests under load', async () => {
      httpService.get.mockReturnValue(
        of({
          data: {},
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        }),
      );

      // Test multiple concurrent connectivity tests
      const promises = Array.from({ length: 50 }, (_, i) =>
        service.testServiceConnectivity(
          `Service${i}`,
          `http://service${i}.com`,
        ),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(50);
      expect(results.every((result) => result === true)).toBe(true);
    });

    it('should properly clean up intervals on destruction', async () => {
      (service as any).config.monitoring.enabled = true;

      // Start monitoring
      (service as any).startHealthMonitoring();

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      await service.onModuleDestroy();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete service lifecycle', async () => {
      // Enable all features
      (service as any).frameworkStatus.enabled = true;
      (service as any).config.framework.enabled = true;
      (service as any).config.aneBridge.enabled = true;
      (service as any).config.monitoring.enabled = true;
      (service as any).config.hybrid.sharedVolumePath = '/test/shared';

      httpService.get.mockReturnValue(
        of({
          data: { capabilities: ['ocr'], version: '1.0.0' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        }),
      );

      // Full lifecycle
      await service.onModuleInit();

      // Verify initialization
      expect(service.isFrameworkEnabled()).toBe(true);
      expect(service.isAneBridgeAvailable()).toBe(true);

      // Test connectivity
      const connectivity = await service.testServiceConnectivity(
        'TestService',
        'http://test.com',
      );
      expect(connectivity).toBe(true);

      // Shutdown
      await service.onModuleDestroy();

      expect(mockLogger.log).toHaveBeenCalledWith(
        'C/ua Framework Integration shut down complete',
      );
    });

    it('should handle degraded mode operation', async () => {
      (service as any).frameworkStatus.enabled = true;
      (service as any).config.framework.enabled = true;
      (service as any).config.aneBridge.enabled = true;
      (service as any).config.aneBridge.fallbackEnabled = true;

      // Mock service failures but allow fallback
      httpService.get
        .mockReturnValueOnce(throwError(() => new Error('Service 1 down')))
        .mockReturnValueOnce(throwError(() => new Error('Service 2 down')))
        .mockReturnValueOnce(throwError(() => new Error('ANE bridge down')));

      await service.onModuleInit();

      const status = service.getFrameworkStatus();
      expect(status.servicesRunning).toEqual([]);
      expect(status.aneBridgeStatus).toBe('fallback');
      expect(service.isFrameworkEnabled()).toBe(false); // No services running
      expect(service.isAneBridgeAvailable()).toBe(false); // Fallback mode
    });

    it('should handle recovery scenarios', async () => {
      (service as any).frameworkStatus.enabled = true;
      (service as any).config.aneBridge.enabled = true;
      (service as any).config.monitoring.enabled = true;

      // Start with ANE bridge in error state
      (service as any).frameworkStatus.aneBridgeStatus = 'error';

      // Mock recovery
      httpService.get.mockReturnValue(
        of({
          data: { capabilities: ['ocr', 'text'], version: '1.1.0' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        }),
      );

      // Perform health check (simulating recovery)
      await (service as any).performHealthCheck();

      const status = service.getFrameworkStatus();
      expect(status.aneBridgeStatus).toBe('connected');
      expect(service.isAneBridgeAvailable()).toBe(true);
    });
  });
});
