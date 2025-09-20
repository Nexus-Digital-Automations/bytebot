/**
 * Browser-Use Service Test Suite
 *
 * Comprehensive unit and integration tests for browser automation service including:
 * - Browser session lifecycle management
 * - Task execution and monitoring
 * - Browser-use Python framework integration
 * - Local process management and coordination
 * - Error handling and recovery mechanisms
 * - Performance monitoring and optimization
 * - Security validation and access control
 */

import { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BrowserUseService } from '../browser-use.service';

import { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock child_process
jest.mock('child_process');
jest.mock('fs/promises');
jest.mock('path');

const mockSpawn = jest.fn();
const mockAccess = jest.fn();
const mockMkdir = jest.fn();
const mockWriteFile = jest.fn();
const mockJoin = jest.fn();
const mockResolve = jest.fn();

// Mock modules
(jest.requireActual('child_process') as any).spawn = mockSpawn;
(jest.requireActual('fs/promises') as any).access = mockAccess;
(jest.requireActual('fs/promises') as any).mkdir = mockMkdir;
(jest.requireActual('fs/promises') as any).writeFile = mockWriteFile;
(jest.requireActual('path') as any).join = mockJoin;
(jest.requireActual('path') as any).resolve = mockResolve;

describe('BrowserUseService', () => {
  let service: BrowserUseService;
  let configService: ConfigService;
  let module: TestingModule;
  let mockChildProcess: jest.Mocked<ChildProcess & EventEmitter>;

  const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    role: 'admin',
  };

  const mockBrowserConfig = {
    headless: true,
    screenshots: true,
    video_recording: false,
    working_directory: '/tmp/browser-use',
    user_data_dir: '/tmp/browser-data',
    log_level: 'INFO',
    session_timeout: 300000,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Setup mock child process
    mockChildProcess = new EventEmitter() as jest.Mocked<
      ChildProcess & EventEmitter
    >;
    mockChildProcess.stdout = new EventEmitter() as any;
    mockChildProcess.stderr = new EventEmitter() as any;
    mockChildProcess.stdin = { write: jest.fn(), end: jest.fn() } as any;
    mockChildProcess.kill = jest.fn();
    mockChildProcess.pid = 12345;

    mockSpawn.mockReturnValue(mockChildProcess);

    // Setup path mocks
    mockJoin.mockImplementation((...args) => args.join('/'));
    mockResolve.mockImplementation((dir) => `/resolved${dir}`);

    // Setup fs mocks
    mockAccess.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);

    module = await Test.createTestingModule({
      providers: [
        BrowserUseService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              switch (key) {
                case 'BROWSER_USE_PYTHON_PATH':
                  return '/usr/bin/python3';
                case 'BROWSER_USE_SCRIPT_PATH':
                  return '/app/browser-use-integration.py';
                case 'BROWSER_USE_WORKING_DIR':
                  return '/tmp/browser-use';
                case 'BROWSER_USE_SESSION_TIMEOUT':
                  return '300000';
                case 'BROWSER_USE_MAX_SESSIONS':
                  return '10';
                default:
                  return undefined;
              }
            }),
          },
        },
      ],
    }).compile();

    service = module.get<BrowserUseService>(BrowserUseService);
    configService = module.get<ConfigService>(ConfigService);

    // Suppress console logs for tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with configuration from ConfigService', () => {
      expect(configService.get).toHaveBeenCalledWith('BROWSER_USE_PYTHON_PATH');
      expect(configService.get).toHaveBeenCalledWith('BROWSER_USE_SCRIPT_PATH');
      expect(configService.get).toHaveBeenCalledWith('BROWSER_USE_WORKING_DIR');
    });

    it('should handle onModuleInit lifecycle', async () => {
      const initSpy = jest.spyOn(service, 'onModuleInit');
      await service.onModuleInit();
      expect(initSpy).toHaveBeenCalled();
    });

    it('should handle onModuleDestroy lifecycle', async () => {
      const destroySpy = jest.spyOn(service, 'onModuleDestroy');
      await service.onModuleDestroy();
      expect(destroySpy).toHaveBeenCalled();
    });
  });

  describe('Session Management', () => {
    describe('createSession', () => {
      const sessionDto = {
        name: 'Test Session',
        browserConfig: mockBrowserConfig,
        timeout: 300000,
        _metadata: { purpose: 'testing' },
      };

      it('should create a new browser session successfully', async () => {
        const result = await service.createSession(sessionDto, mockUser);

        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(result.name).toBe(sessionDto.name);
        expect(result.status).toBe('initializing');
        expect(result.userId).toBe(mockUser.id);
      });

      it('should validate session configuration', async () => {
        const invalidSessionDto = {
          ...sessionDto,
          browserConfig: {
            ...mockBrowserConfig,
            session_timeout: -1000, // Invalid timeout
          },
        };

        await expect(
          service.createSession(invalidSessionDto, mockUser),
        ).rejects.toThrow('Invalid session configuration');
      });

      it('should enforce maximum session limit', async () => {
        // Create multiple sessions up to the limit
        const maxSessions = 10;
        for (let i = 0; i < maxSessions; i++) {
          await service.createSession(
            { ...sessionDto, name: `Session ${i}` },
            mockUser,
          );
        }

        // Attempt to create one more session beyond the limit
        await expect(
          service.createSession(
            { ...sessionDto, name: 'Excess Session' },
            mockUser,
          ),
        ).rejects.toThrow('Maximum session limit reached');
      });

      it('should create unique session IDs', async () => {
        const session1 = await service.createSession(sessionDto, mockUser);
        const session2 = await service.createSession(
          { ...sessionDto, name: 'Session 2' },
          mockUser,
        );

        expect(session1.id).not.toBe(session2.id);
      });
    });

    describe('getSessions', () => {
      it('should return all sessions for a user', async () => {
        // Create some test sessions
        await service.createSession(
          { ...mockBrowserConfig, name: 'Session 1' },
          mockUser,
        );
        await service.createSession(
          { ...mockBrowserConfig, name: 'Session 2' },
          mockUser,
        );

        const sessions = await service.getSessions(mockUser);

        expect(sessions).toHaveLength(2);
        expect(sessions[0].userId).toBe(mockUser.id);
        expect(sessions[1].userId).toBe(mockUser.id);
      });

      it('should return empty array when no sessions exist', async () => {
        const sessions = await service.getSessions(mockUser);
        expect(sessions).toHaveLength(0);
      });

      it('should filter sessions by user', async () => {
        const otherUser = { id: 'other-user', email: 'other@example.com' };

        await service.createSession(
          { ...mockBrowserConfig, name: 'User 1 Session' },
          mockUser,
        );
        await service.createSession(
          { ...mockBrowserConfig, name: 'User 2 Session' },
          otherUser,
        );

        const userSessions = await service.getSessions(mockUser);
        const otherUserSessions = await service.getSessions(otherUser);

        expect(userSessions).toHaveLength(1);
        expect(otherUserSessions).toHaveLength(1);
        expect(userSessions[0].name).toBe('User 1 Session');
        expect(otherUserSessions[0].name).toBe('User 2 Session');
      });
    });

    describe('getSession', () => {
      it('should retrieve a specific session by ID', async () => {
        const createdSession = await service.createSession(
          { ...mockBrowserConfig, name: 'Test Session' },
          mockUser,
        );

        const retrievedSession = await service.getSession(
          createdSession.id,
          mockUser,
        );

        expect(retrievedSession).toBeDefined();
        expect(retrievedSession.id).toBe(createdSession.id);
        expect(retrievedSession.name).toBe('Test Session');
      });

      it('should return null for non-existent session', async () => {
        const result = await service.getSession('non-existent-id', mockUser);
        expect(result).toBeNull();
      });

      it('should enforce user access control', async () => {
        const otherUser = { id: 'other-user', email: 'other@example.com' };
        const session = await service.createSession(
          { ...mockBrowserConfig, name: 'Private Session' },
          otherUser,
        );

        const result = await service.getSession(session.id, mockUser);
        expect(result).toBeNull();
      });
    });

    describe('deleteSession', () => {
      it('should delete a session successfully', async () => {
        const session = await service.createSession(
          { ...mockBrowserConfig, name: 'To Delete' },
          mockUser,
        );

        const result = await service.deleteSession(session.id, mockUser);

        expect(result.deleted).toBe(true);
        expect(result.sessionId).toBe(session.id);

        // Verify session is no longer accessible
        const retrievedSession = await service.getSession(session.id, mockUser);
        expect(retrievedSession).toBeNull();
      });

      it('should handle deletion of non-existent session', async () => {
        await expect(
          service.deleteSession('non-existent-id', mockUser),
        ).rejects.toThrow('Session not found');
      });

      it('should cleanup associated browser processes', async () => {
        const session = await service.createSession(
          { ...mockBrowserConfig, name: 'With Process' },
          mockUser,
        );

        // Simulate active browser process
        mockChildProcess.pid = 12345;

        await service.deleteSession(session.id, mockUser);

        expect(mockChildProcess.kill).toHaveBeenCalled();
      });
    });
  });

  describe('Task Management', () => {
    describe('createTask', () => {
      const taskDto = {
        name: 'Test Task',
        url: 'https://example.com',
        description: 'Test automation task',
        steps: [
          { action: 'navigate', target: 'https://example.com' },
          { action: 'click', target: '#submit-button' },
        ],
        sessionId: 'session-123',
        priority: 1,
        timeout: 30000,
        retryAttempts: 3,
        _metadata: { source: 'api-test' },
      };

      it('should create a new task successfully', async () => {
        const result = await service.createTask(taskDto, mockUser);

        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(result.name).toBe(taskDto.name);
        expect(result.status).toBe('pending');
        expect(result.userId).toBe(mockUser.id);
      });

      it('should validate task configuration', async () => {
        const invalidTaskDto = {
          ...taskDto,
          url: 'invalid-url',
        };

        await expect(
          service.createTask(invalidTaskDto, mockUser),
        ).rejects.toThrow('Invalid task configuration');
      });

      it('should validate session exists', async () => {
        const taskWithInvalidSession = {
          ...taskDto,
          sessionId: 'non-existent-session',
        };

        await expect(
          service.createTask(taskWithInvalidSession, mockUser),
        ).rejects.toThrow('Session not found');
      });

      it('should assign task priority correctly', async () => {
        const highPriorityTask = {
          ...taskDto,
          name: 'High Priority Task',
          priority: 5,
        };

        const result = await service.createTask(highPriorityTask, mockUser);

        expect(result.priority).toBe(5);
      });
    });

    describe('executeTask', () => {
      it('should execute a task successfully', async () => {
        const task = await service.createTask(
          {
            name: 'Execute Test',
            url: 'https://example.com',
            steps: [{ action: 'navigate', target: 'https://example.com' }],
            sessionId: 'session-123',
          },
          mockUser,
        );

        // Mock successful Python process execution
        setTimeout(() => {
          mockChildProcess.emit('message', {
            type: 'task_completed',
            taskId: task.id,
            results: { success: true, _data: 'extracted data' },
          });
        }, 100);

        const result = await service.executeTask(task.id, mockUser);

        expect(result.status).toBe('running');
        expect(result.executionId).toBeDefined();
        expect(mockSpawn).toHaveBeenCalled();
      });

      it('should handle task execution errors', async () => {
        const task = await service.createTask(
          {
            name: 'Error Test',
            url: 'https://example.com',
            steps: [{ action: 'invalid-action', target: 'invalid' }],
            sessionId: 'session-123',
          },
          mockUser,
        );

        // Mock Python process error
        setTimeout(() => {
          mockChildProcess.emit('error', new Error('Python execution failed'));
        }, 100);

        await expect(service.executeTask(task.id, mockUser)).rejects.toThrow(
          'Task execution failed',
        );
      });

      it('should respect task timeout', async () => {
        const shortTimeoutTask = await service.createTask(
          {
            name: 'Timeout Test',
            url: 'https://example.com',
            steps: [{ action: 'navigate', target: 'https://example.com' }],
            sessionId: 'session-123',
            timeout: 1000, // 1 second timeout
          },
          mockUser,
        );

        // Don't emit completion, let it timeout
        await expect(
          service.executeTask(shortTimeoutTask.id, mockUser),
        ).rejects.toThrow('Task execution timeout');
      });

      it('should handle concurrent task execution', async () => {
        const task1 = await service.createTask(
          {
            name: 'Concurrent Task 1',
            url: 'https://example1.com',
            steps: [{ action: 'navigate', target: 'https://example1.com' }],
            sessionId: 'session-123',
          },
          mockUser,
        );

        const task2 = await service.createTask(
          {
            name: 'Concurrent Task 2',
            url: 'https://example2.com',
            steps: [{ action: 'navigate', target: 'https://example2.com' }],
            sessionId: 'session-456',
          },
          mockUser,
        );

        const promise1 = service.executeTask(task1.id, mockUser);
        const promise2 = service.executeTask(task2.id, mockUser);

        // Mock completion for both tasks
        setTimeout(() => {
          mockChildProcess.emit('message', {
            type: 'task_completed',
            taskId: task1.id,
            results: { success: true },
          });
          mockChildProcess.emit('message', {
            type: 'task_completed',
            taskId: task2.id,
            results: { success: true },
          });
        }, 100);

        const [result1, result2] = await Promise.all([promise1, promise2]);

        expect(result1.status).toBe('running');
        expect(result2.status).toBe('running');
      });
    });

    describe('cancelTask', () => {
      it('should cancel a running task', async () => {
        const task = await service.createTask(
          {
            name: 'Cancel Test',
            url: 'https://example.com',
            steps: [{ action: 'navigate', target: 'https://example.com' }],
            sessionId: 'session-123',
          },
          mockUser,
        );

        // Start task execution
        const executePromise = service.executeTask(task.id, mockUser);

        // Cancel the task
        const cancelResult = await service.cancelTask(task.id, mockUser);

        expect(cancelResult.status).toBe('cancelled');
        expect(cancelResult.taskId).toBe(task.id);
        expect(mockChildProcess.kill).toHaveBeenCalled();
      });

      it('should handle cancellation of non-running task', async () => {
        const task = await service.createTask(
          {
            name: 'Not Running',
            url: 'https://example.com',
            steps: [{ action: 'navigate', target: 'https://example.com' }],
            sessionId: 'session-123',
          },
          mockUser,
        );

        await expect(service.cancelTask(task.id, mockUser)).rejects.toThrow(
          'Task is not currently running',
        );
      });
    });
  });

  describe('Browser Operations', () => {
    describe('takeScreenshot', () => {
      it('should take a screenshot successfully', async () => {
        const sessionId = 'session-123';
        const screenshotDto = {
          fullPage: true,
          element: null,
          format: 'png' as const,
          quality: 90,
        };

        // Mock Python process response
        setTimeout(() => {
          mockChildProcess.stdout.emit(
            'data',
            JSON.stringify({
              type: 'screenshot_result',
              sessionId,
              imageData: 'base64-encoded-image-data',
              _metadata: { width: 1920, height: 1080 },
            }),
          );
        }, 100);

        const result = await service.takeScreenshot(
          sessionId,
          screenshotDto,
          mockUser,
        );

        expect(result.sessionId).toBe(sessionId);
        expect(result.imageData).toBeDefined();
        expect(result.format).toBe('png');
      });

      it('should handle screenshot errors', async () => {
        const sessionId = 'invalid-session';
        const screenshotDto = {
          fullPage: true,
          element: null,
          format: 'png' as const,
          quality: 90,
        };

        setTimeout(() => {
          mockChildProcess.stderr.emit(
            'data',
            'Screenshot failed: Session not found',
          );
        }, 100);

        await expect(
          service.takeScreenshot(sessionId, screenshotDto, mockUser),
        ).rejects.toThrow('Screenshot operation failed');
      });
    });

    describe('navigateToUrl', () => {
      it('should navigate to URL successfully', async () => {
        const sessionId = 'session-123';
        const url = 'https://example.com';

        setTimeout(() => {
          mockChildProcess.stdout.emit(
            'data',
            JSON.stringify({
              type: 'navigation_result',
              sessionId,
              url,
              success: true,
              loadTime: 1234,
            }),
          );
        }, 100);

        const result = await service.navigateToUrl(sessionId, url, mockUser);

        expect(result.sessionId).toBe(sessionId);
        expect(result.url).toBe(url);
        expect(result.success).toBe(true);
      });

      it('should handle navigation errors', async () => {
        const sessionId = 'session-123';
        const url = 'https://invalid-domain-that-does-not-exist.com';

        setTimeout(() => {
          mockChildProcess.stderr.emit(
            'data',
            'Navigation failed: DNS resolution failed',
          );
        }, 100);

        await expect(
          service.navigateToUrl(sessionId, url, mockUser),
        ).rejects.toThrow('Navigation failed');
      });
    });

    describe('extractData', () => {
      it('should extract data from page successfully', async () => {
        const sessionId = 'session-123';
        const extractionDto = {
          selectors: [
            { name: 'title', selector: 'h1', attribute: 'textContent' },
            { name: 'links', selector: 'a', attribute: 'href', multiple: true },
          ],
          format: 'json' as const,
          includeMetadata: true,
        };

        setTimeout(() => {
          mockChildProcess.stdout.emit(
            'data',
            JSON.stringify({
              type: 'extraction_result',
              sessionId,
              _data: {
                title: 'Example Page',
                links: [
                  'https://example.com/page1',
                  'https://example.com/page2',
                ],
              },
              _metadata: {
                url: 'https://example.com',
                extractionTime: 150,
              },
            }),
          );
        }, 100);

        const result = await service.extractData(
          sessionId,
          extractionDto,
          mockUser,
        );

        expect(result.sessionId).toBe(sessionId);
        expect(result.data.title).toBe('Example Page');
        expect(result.data.links).toHaveLength(2);
        expect(result.metadata).toBeDefined();
      });

      it('should handle data extraction errors', async () => {
        const sessionId = 'session-123';
        const extractionDto = {
          selectors: [
            {
              name: 'nonexistent',
              selector: '#does-not-exist',
              attribute: 'textContent',
            },
          ],
          format: 'json' as const,
          includeMetadata: false,
        };

        setTimeout(() => {
          mockChildProcess.stderr.emit(
            'data',
            'Extraction failed: Element not found',
          );
        }, 100);

        await expect(
          service.extractData(sessionId, extractionDto, mockUser),
        ).rejects.toThrow('Data extraction failed');
      });
    });
  });

  describe('Performance and Monitoring', () => {
    describe('getSystemHealth', () => {
      it('should return comprehensive system health status', async () => {
        const health = await service.getSystemHealth();

        expect(health.status).toBeDefined();
        expect(health.uptime).toBeGreaterThanOrEqual(0);
        expect(health.activeSessions).toBeGreaterThanOrEqual(0);
        expect(health.memoryUsage).toBeDefined();
        expect(health.timestamp).toBeInstanceOf(Date);
      });

      it('should detect unhealthy system state', async () => {
        // Mock system under stress
        jest.spyOn(process, 'memoryUsage').mockReturnValue({
          rss: 2 * 1024 * 1024 * 1024, // 2GB
          heapTotal: 1.5 * 1024 * 1024 * 1024,
          heapUsed: 1.4 * 1024 * 1024 * 1024,
          external: 100 * 1024 * 1024,
          arrayBuffers: 50 * 1024 * 1024,
        });

        const health = await service.getSystemHealth();

        expect(health.status).toBe('degraded');
        expect(health.memoryUsage.percentage).toBeGreaterThan(90);
      });
    });

    describe('getPerformanceMetrics', () => {
      it('should return performance metrics', async () => {
        const metrics = await service.getPerformanceMetrics();

        expect(metrics.averageTaskDuration).toBeGreaterThanOrEqual(0);
        expect(metrics.errorRate).toBeGreaterThanOrEqual(0);
        expect(metrics.successRate).toBeGreaterThanOrEqual(0);
        expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
        expect(metrics.timestamp).toBeInstanceOf(Date);
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle Python process crashes', async () => {
      const task = await service.createTask(
        {
          name: 'Crash Test',
          url: 'https://example.com',
          steps: [{ action: 'navigate', target: 'https://example.com' }],
          sessionId: 'session-123',
        },
        mockUser,
      );

      // Start execution then crash
      const executePromise = service.executeTask(task.id, mockUser);

      setTimeout(() => {
        mockChildProcess.emit('exit', 1, 'SIGTERM');
      }, 100);

      await expect(executePromise).rejects.toThrow('Python process crashed');
    });

    it('should implement retry logic for failed operations', async () => {
      const task = await service.createTask(
        {
          name: 'Retry Test',
          url: 'https://example.com',
          steps: [{ action: 'navigate', target: 'https://example.com' }],
          sessionId: 'session-123',
          retryAttempts: 3,
        },
        mockUser,
      );

      let attemptCount = 0;
      mockSpawn.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          setTimeout(
            () =>
              mockChildProcess.emit('error', new Error('Temporary failure')),
            50,
          );
        } else {
          setTimeout(() => {
            mockChildProcess.emit('message', {
              type: 'task_completed',
              taskId: task.id,
              results: { success: true },
            });
          }, 50);
        }
        return mockChildProcess;
      });

      const result = await service.executeTask(task.id, mockUser);

      expect(attemptCount).toBe(3);
      expect(result.status).toBe('running');
    });

    it('should handle file system errors gracefully', async () => {
      mockAccess.mockRejectedValue(new Error('Permission denied'));

      await expect(
        service.createSession(
          {
            name: 'FS Error Test',
            browserConfig: mockBrowserConfig,
          },
          mockUser,
        ),
      ).rejects.toThrow('Failed to initialize session directory');
    });

    it('should cleanup resources on service destruction', async () => {
      // Create some sessions and tasks
      await service.createSession(
        { name: 'Cleanup Test', browserConfig: mockBrowserConfig },
        mockUser,
      );

      const killSpy = jest.spyOn(mockChildProcess, 'kill');

      await service.onModuleDestroy();

      expect(killSpy).toHaveBeenCalled();
    });
  });

  describe('Security and Access Control', () => {
    it('should validate user permissions for operations', async () => {
      const session = await service.createSession(
        { name: 'Security Test', browserConfig: mockBrowserConfig },
        mockUser,
      );

      const unauthorizedUser = {
        id: 'unauthorized',
        email: 'unauthorized@example.com',
        role: 'user',
      };

      await expect(
        service.getSession(session.id, unauthorizedUser),
      ).resolves.toBeNull();
    });

    it('should sanitize file paths to prevent directory traversal', async () => {
      const maliciousConfig = {
        ...mockBrowserConfig,
        working_directory: '../../../etc/passwd',
      };

      await expect(
        service.createSession(
          { name: 'Security Test', browserConfig: maliciousConfig },
          mockUser,
        ),
      ).rejects.toThrow('Invalid working directory path');
    });

    it('should validate URL patterns for navigation', async () => {
      const sessionId = 'session-123';
      const maliciousUrl = 'javascript:alert("xss")';

      await expect(
        service.navigateToUrl(sessionId, maliciousUrl, mockUser),
      ).rejects.toThrow('Invalid URL format');
    });
  });

  describe('Memory Management', () => {
    it('should monitor memory usage during operations', async () => {
      const initialMemory = process.memoryUsage();

      // Create multiple sessions to increase memory usage
      for (let i = 0; i < 5; i++) {
        await service.createSession(
          { name: `Memory Test ${i}`, browserConfig: mockBrowserConfig },
          mockUser,
        );
      }

      const currentMemory = process.memoryUsage();
      const memoryIncrease = currentMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 100MB for test)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });

    it('should cleanup memory after session deletion', async () => {
      const session = await service.createSession(
        { name: 'Memory Cleanup Test', browserConfig: mockBrowserConfig },
        mockUser,
      );

      const beforeDeletion = process.memoryUsage();
      await service.deleteSession(session.id, mockUser);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const afterDeletion = process.memoryUsage();

      // Memory should not increase significantly after cleanup
      expect(afterDeletion.heapUsed - beforeDeletion.heapUsed).toBeLessThan(
        10 * 1024 * 1024,
      ); // 10MB tolerance
    });
  });
});
