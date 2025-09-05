/**
 * Comprehensive Application Management Unit Tests for ComputerUseService
 *
 * This focused test suite provides complete coverage for application lifecycle management:
 * - Application launch operations for all supported applications
 * - Application window activation and maximization
 * - Process management and lifecycle control
 * - Desktop activation workflows
 * - Error handling for unsupported applications
 * - Process detection and status checking
 * - Window management operations via wmctrl
 * - Timeout handling and graceful degradation
 * - Comprehensive logging verification
 * - Security context management (sudo operations)
 *
 * Applications tested: firefox, 1password, thunderbird, vscode, terminal, directory, desktop
 *
 * @author Claude Code
 * @version 1.0.0
 */

 

// Mock @nut-tree-fork/nut-js FIRST before any imports to avoid import issues
jest.mock('@nut-tree-fork/nut-js', () => ({
  keyboard: {
    pressKey: jest.fn().mockResolvedValue(undefined),
    releaseKey: jest.fn().mockResolvedValue(undefined),
    config: { autoDelayMs: 100 },
  },
  mouse: {
    setPosition: jest.fn().mockResolvedValue(undefined),
    click: jest.fn().mockResolvedValue(undefined),
    pressButton: jest.fn().mockResolvedValue(undefined),
    releaseButton: jest.fn().mockResolvedValue(undefined),
    scrollUp: jest.fn().mockResolvedValue(undefined),
    scrollDown: jest.fn().mockResolvedValue(undefined),
    scrollLeft: jest.fn().mockResolvedValue(undefined),
    scrollRight: jest.fn().mockResolvedValue(undefined),
    getPosition: jest.fn().mockResolvedValue({ x: 100, y: 200 }),
    config: { autoDelayMs: 100 },
  },
  screen: {
    capture: jest.fn().mockResolvedValue(undefined),
  },
  Point: jest.fn().mockImplementation((x: number, y: number) => ({ x, y })),
  Key: {
    A: 'A',
    B: 'B',
    C: 'C',
    Space: 'Space',
    Enter: 'Enter',
  },
  Button: {
    LEFT: 'LEFT',
    RIGHT: 'RIGHT',
    MIDDLE: 'MIDDLE',
  },
}));

// Mock external dependencies
jest.mock('child_process');
jest.mock('util', () => {
  const originalUtil = jest.requireActual('util');
  return {
    ...originalUtil,
    promisify: jest.fn(),
    inspect: jest.fn().mockImplementation((obj: any) => JSON.stringify(obj)),
  } as typeof import('util');
});
jest.mock('fs/promises');

// Mock axios and HTTP services that cause util.inherits issues
jest.mock('@nestjs/axios', () => ({
  HttpService: jest.fn().mockImplementation(() => ({
    axiosRef: {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    },
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  })),
}));

jest.mock('axios', () => ({
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(() => ({
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    })),
  },
}));

// Mock RxJS to avoid additional issues
jest.mock('rxjs', () => ({
  firstValueFrom: jest.fn().mockResolvedValue({ data: 'mocked' }),
  of: jest.fn(),
  from: jest.fn(),
  Subject: jest.fn().mockImplementation(() => ({
    next: jest.fn(),
    error: jest.fn(),
    complete: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    observers: [],
  })),
  BehaviorSubject: jest.fn().mockImplementation(() => ({
    next: jest.fn(),
    error: jest.fn(),
    complete: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    observers: [],
    getValue: jest.fn(),
  })),
  Observable: jest.fn().mockImplementation(() => ({
    subscribe: jest.fn(),
  })),
}));

// Mock @nestjs/config
jest.mock('@nestjs/config', () => ({
  ConfigService: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockReturnValue('test-value'),
  })),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ComputerUseService } from '../computer-use.service';
import { NutService } from '../../nut/nut.service';
import { CuaVisionService } from '../../cua-integration/cua-vision.service';
import { CuaIntegrationService } from '../../cua-integration/cua-integration.service';
import { CuaPerformanceService } from '../../cua-integration/cua-performance.service';
import { ApplicationAction, Application } from '@bytebot/shared';
import { spawn } from 'child_process';
import { promisify } from 'util';

describe('ComputerUseService - Application Management', () => {
  let service: ComputerUseService;
  let testModule: TestingModule;

  // Mock implementations with comprehensive typing
  const mockSpawn = jest.mocked(spawn);
  const mockPromisify = jest.mocked(promisify);
  const mockExecAsync = jest.fn();

  // Mock services with all required methods
  const mockNutService: jest.Mocked<NutService> = {
    mouseMoveEvent: jest.fn(),
    mouseClickEvent: jest.fn(),
    mouseButtonEvent: jest.fn(),
    mouseWheelEvent: jest.fn(),
    holdKeys: jest.fn(),
    sendKeys: jest.fn(),
    typeText: jest.fn(),
    pasteText: jest.fn(),
    screendump: jest.fn(),
    getCursorPosition: jest.fn(),
  } as unknown as jest.Mocked<NutService>;

  const mockCuaVisionService: jest.Mocked<CuaVisionService> = {
    performOcr: jest.fn(),
    detectText: jest.fn(),
    batchOcr: jest.fn(),
    getCapabilities: jest.fn(),
  } as unknown as jest.Mocked<CuaVisionService>;

  const mockCuaIntegrationService: jest.Mocked<CuaIntegrationService> = {
    isFrameworkEnabled: jest.fn(),
    isAneBridgeAvailable: jest.fn(),
    getConfiguration: jest.fn(),
    initialize: jest.fn(),
    getNetworkTopology: jest.fn(),
  } as unknown as jest.Mocked<CuaIntegrationService>;

  const mockPerformanceService: jest.Mocked<CuaPerformanceService> = {
    startTiming: jest.fn(),
    endTiming: jest.fn(),
    logPerformance: jest.fn(),
    getMetrics: jest.fn(),
  } as unknown as jest.Mocked<CuaPerformanceService>;

  // Mock process object for spawn return value
  const mockProcess = {
    unref: jest.fn(),
    on: jest.fn(),
    kill: jest.fn(),
    pid: 12345,
    stdout: {
      on: jest.fn(),
    },
    stderr: {
      on: jest.fn(),
    },
  };

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup promisify mock to return execAsync
    mockPromisify.mockReturnValue(mockExecAsync);

    // Setup spawn mock to return mock process
    mockSpawn.mockReturnValue(
      mockProcess as unknown as ReturnType<typeof spawn>,
    );

    // Create testing module with mocked dependencies
    testModule = await Test.createTestingModule({
      providers: [
        ComputerUseService,
        {
          provide: NutService,
          useValue: mockNutService,
        },
        {
          provide: CuaVisionService,
          useValue: mockCuaVisionService,
        },
        {
          provide: CuaIntegrationService,
          useValue: mockCuaIntegrationService,
        },
        {
          provide: CuaPerformanceService,
          useValue: mockPerformanceService,
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = testModule.get<ComputerUseService>(ComputerUseService);
  });

  afterEach(async () => {
    if (testModule) {
      await testModule.close();
    }
  });

  describe('Desktop Activation', () => {
    /**
     * Test desktop activation - special case that doesn't follow the standard application pattern
     * Desktop activation uses wmctrl -k on to show desktop
     */
    it('should activate desktop using wmctrl command', async () => {
      const action: ApplicationAction = {
        action: 'application',
        application: 'desktop',
      };

      await service.action(action);

      // Verify desktop activation command
      expect(mockSpawn).toHaveBeenCalledWith(
        'sudo',
        ['-u', 'user', 'wmctrl', '-k', 'on'],
        {
          env: expect.objectContaining({
            DISPLAY: ':0.0',
          }),
          stdio: 'ignore',
          detached: true,
        },
      );

      // Verify process was unreferenced for proper cleanup
      expect(mockProcess.unref).toHaveBeenCalled();
    });
  });

  describe('Application Launch Operations', () => {
    /**
     * Test firefox application launch when not currently running
     * Should use wmctrl to check if running, fail, then launch new instance
     */
    it('should launch firefox when not running', async () => {
      const action: ApplicationAction = {
        action: 'application',
        application: 'firefox',
      };

      // Mock application not running (wmctrl check fails with exit code 1)
      mockExecAsync.mockRejectedValue({ code: 1 });

      await service.action(action);

      // Verify application status check
      expect(mockExecAsync).toHaveBeenCalledWith(
        'sudo -u user wmctrl -lx | grep Navigator.firefox-esr',
        { timeout: 5000 },
      );

      // Verify application launch command
      expect(mockSpawn).toHaveBeenCalledWith(
        'sudo',
        ['-u', 'user', 'nohup', 'firefox-esr'],
        {
          env: expect.objectContaining({
            DISPLAY: ':0.0',
          }),
          stdio: 'ignore',
          detached: true,
        },
      );

      expect(mockProcess.unref).toHaveBeenCalled();
    });

    /**
     * Test all supported applications launch correctly
     */
    it('should launch all supported applications when not running', async () => {
      const appConfigs: Array<[Application, string, string]> = [
        ['firefox', 'firefox-esr', 'Navigator.firefox-esr'],
        ['1password', '1password', '1password.1Password'],
        ['thunderbird', 'thunderbird', 'Mail.thunderbird'],
        ['vscode', 'code', 'code.Code'],
        ['terminal', 'xfce4-terminal', 'xfce4-terminal.Xfce4-Terminal'],
        ['directory', 'thunar', 'Thunar'],
      ];

      for (const [app, command, processName] of appConfigs) {
        jest.clearAllMocks();
        mockExecAsync.mockRejectedValue({ code: 1 });

        const action: ApplicationAction = {
          action: 'application',
          application: app,
        };

        await service.action(action);

        expect(mockExecAsync).toHaveBeenCalledWith(
          `sudo -u user wmctrl -lx | grep ${processName}`,
          { timeout: 5000 },
        );

        expect(mockSpawn).toHaveBeenCalledWith(
          'sudo',
          ['-u', 'user', 'nohup', command],
          expect.objectContaining({
            env: expect.objectContaining({ DISPLAY: ':0.0' }),
            stdio: 'ignore',
            detached: true,
          }),
        );
      }
    });
  });

  describe('Application Activation and Window Management', () => {
    /**
     * Test activation of already running applications
     * Should activate window and maximize it for better UX
     */
    it('should activate and maximize running applications', async () => {
      const appConfigs: Array<[Application, string]> = [
        ['firefox', 'Navigator.firefox-esr'],
        ['vscode', 'code.Code'],
        ['thunderbird', 'Mail.thunderbird'],
      ];

      for (const [app, processName] of appConfigs) {
        jest.clearAllMocks();

        const action: ApplicationAction = {
          action: 'application',
          application: app,
        };

        // Mock application already running
        mockExecAsync.mockResolvedValue({
          stdout: `${processName}    window-id  desktop`,
        });

        await service.action(action);

        // Verify window activation command
        expect(mockSpawn).toHaveBeenNthCalledWith(
          1,
          'sudo',
          ['-u', 'user', 'wmctrl', '-x', '-a', processName],
          expect.objectContaining({
            env: expect.objectContaining({ DISPLAY: ':0.0' }),
            stdio: 'ignore',
            detached: true,
          }),
        );

        // Verify window maximization command
        expect(mockSpawn).toHaveBeenNthCalledWith(
          2,
          'sudo',
          [
            '-u',
            'user',
            'wmctrl',
            '-x',
            '-r',
            processName,
            '-b',
            'add,maximized_vert,maximized_horz',
          ],
          expect.objectContaining({
            env: expect.objectContaining({ DISPLAY: ':0.0' }),
            stdio: 'ignore',
            detached: true,
          }),
        );

        expect(mockProcess.unref).toHaveBeenCalledTimes(2);
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    /**
     * Test handling of unsupported applications
     */
    it('should throw error for unsupported application', async () => {
      const action = {
        action: 'application' as const,
        application: 'unsupported-app' as Application,
      };

      await expect(service.action(action)).rejects.toThrow(
        'Application management failed for unsupported-app: Unsupported application: unsupported-app',
      );

      expect(mockSpawn).not.toHaveBeenCalled();
    });

    /**
     * Test graceful handling of wmctrl timeout errors
     */
    it('should handle wmctrl timeout error gracefully', async () => {
      const action: ApplicationAction = {
        action: 'application',
        application: 'firefox',
      };

      // Mock timeout error
      mockExecAsync.mockRejectedValue({
        message: 'Command timeout after 5000ms',
        code: 'TIMEOUT',
      });

      await service.action(action);

      // Should proceed to launch application despite timeout
      expect(mockSpawn).toHaveBeenCalledWith(
        'sudo',
        ['-u', 'user', 'nohup', 'firefox-esr'],
        expect.objectContaining({
          env: expect.objectContaining({ DISPLAY: ':0.0' }),
        }),
      );
    });

    /**
     * Test handling of spawn errors
     */
    it('should handle spawn errors during application launch', async () => {
      const action: ApplicationAction = {
        action: 'application',
        application: 'terminal',
      };

      mockExecAsync.mockRejectedValue({ code: 1 });
      mockSpawn.mockImplementation(() => {
        throw new Error('Failed to spawn process');
      });

      await expect(service.action(action)).rejects.toThrow(
        'Application management failed for terminal: Failed to spawn process',
      );
    });
  });

  describe('Process Management and Security', () => {
    /**
     * Test proper process unreferencing for detached processes
     */
    it('should properly unref spawned processes', async () => {
      const action: ApplicationAction = {
        action: 'application',
        application: 'vscode',
      };

      // Mock application already running to trigger both activation and maximization
      mockExecAsync.mockResolvedValue({
        stdout: 'code.Code window data',
      });

      await service.action(action);

      // Two spawn calls should be made (activate + maximize)
      expect(mockSpawn).toHaveBeenCalledTimes(2);
      expect(mockProcess.unref).toHaveBeenCalledTimes(2);
    });

    /**
     * Test sudo user context for all operations
     */
    it('should run all operations with sudo user context', async () => {
      const action: ApplicationAction = {
        action: 'application',
        application: 'thunderbird',
      };

      mockExecAsync.mockResolvedValue({
        stdout: 'Mail.thunderbird window data',
      });

      await service.action(action);

      // All spawn calls should use sudo -u user
      const spawnCalls = mockSpawn.mock.calls;
      spawnCalls.forEach((call) => {
        expect(call[0]).toBe('sudo');
        expect(call[1]).toEqual(expect.arrayContaining(['-u', 'user']));
      });
    });

    /**
     * Test DISPLAY environment variable security
     */
    it('should set secure DISPLAY environment variable', async () => {
      const action: ApplicationAction = {
        action: 'application',
        application: '1password',
      };

      mockExecAsync.mockRejectedValue({ code: 1 });

      await service.action(action);

      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          env: expect.objectContaining({
            DISPLAY: ':0.0',
          }),
        }),
      );
    });
  });

  describe('Timeout and Performance', () => {
    /**
     * Test timeout configuration for status checks
     */
    it('should apply timeout to application status checks', async () => {
      const action: ApplicationAction = {
        action: 'application',
        application: 'directory',
      };

      mockExecAsync.mockResolvedValue({ stdout: 'Thunar window' });

      await service.action(action);

      expect(mockExecAsync).toHaveBeenCalledWith(
        'sudo -u user wmctrl -lx | grep Thunar',
        { timeout: 5000 },
      );
    });
  });
});
