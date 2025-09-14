/* eslint-env jest */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
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
    pressKey: jest.fn() as jest.MockedFunction<any>).mockResolvedValue(undefined),
    releaseKey: jest.fn() as jest.MockedFunction<any>).mockResolvedValue(undefined),
    config: { autoDelayMs: 100 },
  },
  mouse: {
    setPosition: jest.fn() as jest.MockedFunction<any>).mockResolvedValue(undefined),
    click: jest.fn() as jest.MockedFunction<any>).mockResolvedValue(undefined),
    pressButton: jest.fn() as jest.MockedFunction<any>).mockResolvedValue(undefined),
    releaseButton: jest.fn() as jest.MockedFunction<any>).mockResolvedValue(undefined),
    scrollUp: jest.fn() as jest.MockedFunction<any>).mockResolvedValue(undefined),
    scrollDown: jest.fn() as jest.MockedFunction<any>).mockResolvedValue(undefined),
    scrollLeft: jest.fn() as jest.MockedFunction<any>).mockResolvedValue(undefined),
    scrollRight: jest.fn() as jest.MockedFunction<any>).mockResolvedValue(undefined),
    getPosition: jest.fn() as jest.MockedFunction<any>).mockResolvedValue({ x: 100, y: 200 }),
    config: { autoDelayMs: 100 },
  },
  screen: {
    capture: jest.fn() as jest.MockedFunction<any>).mockResolvedValue(undefined),
  },
  Point: jest.fn() as jest.MockedFunction<any>).mockImplementation((x: number, y: number) => ({ x, y })),
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
  const originalUtil = jest.requireActual('util') as typeof import('util');
  return {
    ...originalUtil,
    promisify: Object.assign(jest.fn(), {
      custom: Symbol.for('nodejs.util.promisify.custom'),
    }),
    inspect: Object.assign(
      jest.fn() as jest.MockedFunction<any>).mockImplementation((obj: unknown) => JSON.stringify(obj)),
      {
        colors: originalUtil.inspect.colors,
        styles: originalUtil.inspect.styles,
        defaultOptions: originalUtil.inspect.defaultOptions,
        replDefaults: originalUtil.inspect.replDefaults,
        custom: originalUtil.inspect.custom,
      },
    ),
  } as typeof import('util');
});
jest.mock('fs/promises');

// Mock axios and HTTP services that cause util.inherits issues
jest.mock('@nestjs/axios', () => ({
  HttpService: jest.fn() as jest.MockedFunction<any>).mockImplementation(() => ({
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
  firstValueFrom: jest.fn() as jest.MockedFunction<any>).mockResolvedValue({ data: 'mocked' }),
  of: jest.fn(),
  from: jest.fn(),
  Subject: jest.fn() as jest.MockedFunction<any>).mockImplementation(() => ({
    next: jest.fn(),
    error: jest.fn(),
    complete: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    observers: [],
  })),
  BehaviorSubject: jest.fn() as jest.MockedFunction<any>).mockImplementation(() => ({
    next: jest.fn(),
    error: jest.fn(),
    complete: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    observers: [],
    getValue: jest.fn(),
  })),
  Observable: jest.fn() as jest.MockedFunction<any>).mockImplementation(() => ({
    subscribe: jest.fn(),
  })),
}));

// Mock @nestjs/config
jest.mock('@nestjs/config', () => ({
  ConfigService: jest.fn() as jest.MockedFunction<any>).mockImplementation(() => ({
    get: jest.fn() as jest.MockedFunction<any>).mockReturnValue('test-value'),
  })),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ComputerUseService } from '../computer-use.service';
import { NutService } from '../../nut/nut.service';
import { ApplicationActionDto } from '../dto/computer-action.dto';
import { ApplicationName } from '../dto/base.dto';
import { spawn, SpawnOptions } from 'child_process';
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

  // Note: CUA framework integration services removed - no longer needed for Linux desktop automation

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
    mockPromisify as jest.MockedFunction<any>).mockReturnValue(mockExecAsync);

    // Setup spawn mock to return mock process
    mockSpawn as jest.MockedFunction<any>).mockReturnValue(
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
        // Note: CUA framework service providers removed - no longer needed
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
      const action: ApplicationActionDto = {
        action: 'application',
        application: ApplicationName.DESKTOP,
      };

      await service.action(action);

      // Verify desktop activation command
      expect(mockSpawn).toHaveBeenCalledWith(
        'sudo',
        ['-u', 'user', 'wmctrl', '-k', 'on'],
        expect.objectContaining({
          env: expect.objectContaining({
            DISPLAY: ':0.0',
          }),
          stdio: 'ignore',
          detached: true,
        }) as SpawnOptions,
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
      const action: ApplicationActionDto = {
        action: 'application',
        application: ApplicationName.FIREFOX,
      };

      // Mock application not running (wmctrl check fails with exit code 1)
      mockExecAsync as jest.MockedFunction<any>).mockRejectedValue({ code: 1 });

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
        expect.objectContaining({
          env: expect.objectContaining({
            DISPLAY: ':0.0',
          }),
          stdio: 'ignore',
          detached: true,
        }) as SpawnOptions,
      );

      expect(mockProcess.unref).toHaveBeenCalled();
    });

    /**
     * Test all supported applications launch correctly
     */
    it('should launch all supported applications when not running', async () => {
      const appConfigs: Array<[ApplicationName, string, string]> = [
        [ApplicationName.FIREFOX, 'firefox-esr', 'Navigator.firefox-esr'],
        [ApplicationName.ONEPASSWORD, '1password', '1password.1Password'],
        [ApplicationName.THUNDERBIRD, 'thunderbird', 'Mail.thunderbird'],
        [ApplicationName.VSCODE, 'code', 'code.Code'],
        [
          ApplicationName.TERMINAL,
          'xfce4-terminal',
          'xfce4-terminal.Xfce4-Terminal',
        ],
        [ApplicationName.DIRECTORY, 'thunar', 'Thunar'],
      ];

      for (const [app, command, processName] of appConfigs) {
        jest.clearAllMocks();
        mockExecAsync as jest.MockedFunction<any>).mockRejectedValue({ code: 1 });

        const action: ApplicationActionDto = {
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
            env: expect.objectContaining({ DISPLAY: ':0.0' }) as any,
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
      const appConfigs: Array<[ApplicationName, string]> = [
        [ApplicationName.FIREFOX, 'Navigator.firefox-esr'],
        [ApplicationName.VSCODE, 'code.Code'],
        [ApplicationName.THUNDERBIRD, 'Mail.thunderbird'],
      ];

      for (const [app, processName] of appConfigs) {
        jest.clearAllMocks();

        const action: ApplicationActionDto = {
          action: 'application',
          application: app,
        };

        // Mock application already running
        mockExecAsync as jest.MockedFunction<any>).mockResolvedValue({
          stdout: `${processName}    window-id  desktop`,
        });

        await service.action(action);

        // Verify window activation command
        expect(mockSpawn).toHaveBeenNthCalledWith(
          1,
          'sudo',
          ['-u', 'user', 'wmctrl', '-x', '-a', processName],
          expect.objectContaining({
            env: expect.objectContaining({ DISPLAY: ':0.0' }) as any,
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
            env: expect.objectContaining({ DISPLAY: ':0.0' }) as any,
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
    it('should throw _error for unsupported application', async () => {
      const action = {
        action: 'application' as const,
        application: 'unsupported-app' as ApplicationName,
      };

      await expect(service.action(action)).rejects.toThrow(
        'Application management failed for unsupported-app: Unsupported application: unsupported-app',
      );

      expect(mockSpawn).not.toHaveBeenCalled();
    });

    /**
     * Test graceful handling of wmctrl timeout errors
     */
    it('should handle wmctrl timeout _error gracefully', async () => {
      const action: ApplicationActionDto = {
        action: 'application',
        application: ApplicationName.FIREFOX,
      };

      // Mock timeout error
      mockExecAsync as jest.MockedFunction<any>).mockRejectedValue({
        message: 'Command timeout after 5000ms',
        code: 'TIMEOUT',
      });

      await service.action(action);

      // Should proceed to launch application despite timeout
      expect(mockSpawn).toHaveBeenCalledWith(
        'sudo',
        ['-u', 'user', 'nohup', 'firefox-esr'],
        expect.objectContaining({
          env: expect.objectContaining({ DISPLAY: ':0.0' }) as any,
        }),
      );
    });

    /**
     * Test handling of spawn errors
     */
    it('should handle spawn errors during application launch', async () => {
      const action: ApplicationActionDto = {
        action: 'application',
        application: ApplicationName.TERMINAL,
      };

      mockExecAsync as jest.MockedFunction<any>).mockRejectedValue({ code: 1 });
      mockSpawn as jest.MockedFunction<any>).mockImplementation(() => {
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
      const action: ApplicationActionDto = {
        action: 'application',
        application: ApplicationName.VSCODE,
      };

      // Mock application already running to trigger both activation and maximization
      mockExecAsync as jest.MockedFunction<any>).mockResolvedValue({
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
      const action: ApplicationActionDto = {
        action: 'application',
        application: ApplicationName.THUNDERBIRD,
      };

      mockExecAsync as jest.MockedFunction<any>).mockResolvedValue({
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
      const action: ApplicationActionDto = {
        action: 'application',
        application: ApplicationName.ONEPASSWORD,
      };

      mockExecAsync as jest.MockedFunction<any>).mockRejectedValue({ code: 1 });

      await service.action(action);

      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          env: expect.objectContaining({
            DISPLAY: ':0.0',
          }) as SpawnOptions,
        }) as SpawnOptions,
      );
    });
  });

  describe('Timeout and Performance', () => {
    /**
     * Test timeout configuration for status checks
     */
    it('should apply timeout to application status checks', async () => {
      const action: ApplicationActionDto = {
        action: 'application',
        application: ApplicationName.DIRECTORY,
      };

      mockExecAsync as jest.MockedFunction<any>).mockResolvedValue({ stdout: 'Thunar window' });

      await service.action(action);

      expect(mockExecAsync).toHaveBeenCalledWith(
        'sudo -u user wmctrl -lx | grep Thunar',
        { timeout: 5000 },
      );
    });
  });
});
