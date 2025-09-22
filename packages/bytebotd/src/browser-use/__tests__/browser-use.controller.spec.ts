/**
 * Unit Tests for BrowserUseController
 *
 * Comprehensive test suite for browser automation REST API controller including:
 * - All HTTP endpoints (execute, navigate, wait, status, screenshot, interaction)
 * - Authentication and authorization testing
 * - Request/response validation
 * - Error handling and edge cases
 * - Performance requirements validation
 * - Security boundary testing
 *
 * Coverage Target: >95% (Critical API controller)
 *
 * @author Testing & Quality Assurance Agent
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { BrowserUseController } from '../browser-use.controller';
import { BrowserUseService } from '../browser-use.service';
import { BrowserInteractionService } from '../browser-interaction.service';
import { BrowserSessionService } from '../browser-session.service';
import {
  BrowserExecuteDto,
  BrowserNavigateDto,
  BrowserWaitDto,
  BrowserStatusDto,
  BrowserScreenshotDto,
  BrowserInteractionDto,
} from '../dto';

// Mock DTOs for testing
const mockExecuteDto: BrowserExecuteDto = {
  script: 'console.log("test script");',
  sessionId: 'test-session-123',
  parameters: { testParam: 'value' },
  captureScreenshots: true,
};

const mockNavigateDto: BrowserNavigateDto = {
  url: 'https://example.com',
  sessionId: 'test-session-123',
  captureScreenshot: true,
  options: { waitUntil: 'load' },
};

const mockWaitDto: BrowserWaitDto = {
  type: 'element',
  selector: '#test-element',
  sessionId: 'test-session-123',
  timeout: 5000,
  condition: 'visible',
  options: {},
};

const mockStatusDto: BrowserStatusDto = {
  sessionId: 'test-session-123',
};

const mockScreenshotDto: BrowserScreenshotDto = {
  sessionId: 'test-session-123',
  selector: '#test-element',
  returnBase64: true,
  options: { fullPage: false },
};

const mockInteractionDto: BrowserInteractionDto = {
  type: 'click',
  selector: '#test-button',
  sessionId: 'test-session-123',
  value: '',
  captureScreenshot: false,
  options: {},
};

const mockUser = {
  id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  roles: ['user'],
};

describe('BrowserUseController', () => {
  let controller: BrowserUseController;
  let browserUseService: jest.Mocked<BrowserUseService>;
  let browserInteractionService: jest.Mocked<BrowserInteractionService>;
  let browserSessionService: jest.Mocked<BrowserSessionService>;
  let module: TestingModule;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    // Create mocked services
    const mockBrowserUseService = {
      executeScript: jest.fn(),
      navigate: jest.fn(),
      wait: jest.fn(),
      getSystemHealth: jest.fn(),
      captureScreenshot: jest.fn(),
    };

    const mockBrowserInteractionService = {
      performInteraction: jest.fn(),
      click: jest.fn(),
      type: jest.fn(),
    };

    const mockBrowserSessionService = {
      createSession: jest.fn(),
      getSession: jest.fn(),
      destroySession: jest.fn(),
      getSessionStatus: jest.fn(),
      getAllSessions: jest.fn(),
    };

    // Create testing module
    module = await Test.createTestingModule({
      controllers: [BrowserUseController],
      providers: [
        {
          provide: BrowserUseService,
          useValue: mockBrowserUseService,
        },
        {
          provide: BrowserInteractionService,
          useValue: mockBrowserInteractionService,
        },
        {
          provide: BrowserSessionService,
          useValue: mockBrowserSessionService,
        },
      ],
    }).compile();

    controller = module.get<BrowserUseController>(BrowserUseController);
    browserUseService = module.get(BrowserUseService);
    browserInteractionService = module.get(BrowserInteractionService);
    browserSessionService = module.get(BrowserSessionService);

    // Mock logger to capture logging behavior
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await module.close();
  });

  describe('Controller Initialization', () => {
    it('should be defined and properly initialized', () => {
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(BrowserUseController);
    });

    it('should log initialization messages', () => {
      expect(loggerSpy).toHaveBeenCalledWith(
        'Browser-Use Controller initialized with local-only architecture',
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        'BYTEBOT INTEGRATION: Browser automation API endpoints active',
      );
    });

    it('should inject all required services', () => {
      expect(browserUseService).toBeDefined();
      expect(browserInteractionService).toBeDefined();
      expect(browserSessionService).toBeDefined();
    });
  });

  describe('executeScript endpoint', () => {
    describe('Successful Execution', () => {
      it('should execute script successfully with existing session', async () => {
        const mockResult = {
          output: 'script executed successfully',
          screenshots: ['screenshot1.png'],
        };

        browserUseService.executeScript.mockResolvedValue(mockResult);

        const result = await controller.executeScript(mockExecuteDto, mockUser);

        expect(result.success).toBe(true);
        expect(result.result).toBe(mockResult);
        expect(result.sessionId).toBe(mockExecuteDto.sessionId);
        expect(result.screenshots).toEqual(mockResult.screenshots);
        expect(result.timing).toBeDefined();
        expect(result.timing.duration).toBeDefined();

        expect(browserUseService.executeScript).toHaveBeenCalledWith(
          mockExecuteDto.script,
          mockExecuteDto.sessionId,
          mockExecuteDto.parameters,
          mockExecuteDto.captureScreenshots,
        );
      });

      it('should create new session if sessionId not provided', async () => {
        const executeDto = { ...mockExecuteDto, sessionId: undefined };
        const newSessionId = 'new-session-456';
        const mockResult = { output: 'script executed' };

        browserSessionService.createSession.mockResolvedValue(newSessionId);
        browserUseService.executeScript.mockResolvedValue(mockResult);

        const result = await controller.executeScript(executeDto, mockUser);

        expect(result.success).toBe(true);
        expect(browserSessionService.createSession).toHaveBeenCalledWith({
          options: {},
        });
        expect(browserUseService.executeScript).toHaveBeenCalledWith(
          executeDto.script,
          newSessionId,
          executeDto.parameters,
          executeDto.captureScreenshots,
        );
      });

      it('should handle script execution without screenshots', async () => {
        const executeDto = { ...mockExecuteDto, captureScreenshots: false };
        const mockResult = { output: 'script executed' };

        browserUseService.executeScript.mockResolvedValue(mockResult);

        const result = await controller.executeScript(executeDto, mockUser);

        expect(result.success).toBe(true);
        expect(result.screenshots).toBeUndefined();
      });

      it('should measure and return execution timing', async () => {
        const mockResult = { output: 'script executed' };
        browserUseService.executeScript.mockResolvedValue(mockResult);

        const startTime = Date.now();
        const result = await controller.executeScript(mockExecuteDto, mockUser);
        const endTime = Date.now();

        expect(result.timing.startTime).toBeGreaterThanOrEqual(startTime);
        expect(result.timing.endTime).toBeLessThanOrEqual(endTime);
        expect(result.timing.duration).toBe(
          result.timing.endTime - result.timing.startTime,
        );
      });
    });

    describe('Error Handling', () => {
      it('should handle service execution errors gracefully', async () => {
        const errorMessage = 'Script execution failed';
        browserUseService.executeScript.mockRejectedValue(
          new Error(errorMessage),
        );

        const result = await controller.executeScript(mockExecuteDto, mockUser);

        expect(result.success).toBe(false);
        expect(result.error).toBe(errorMessage);
        expect(result.result).toBeNull();
        expect(result.timing).toBeDefined();
      });

      it('should handle unknown errors', async () => {
        browserUseService.executeScript.mockRejectedValue('Unknown error');

        const result = await controller.executeScript(mockExecuteDto, mockUser);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unknown execution error');
        expect(result.result).toBeNull();
      });

      it('should handle session creation errors', async () => {
        const executeDto = { ...mockExecuteDto, sessionId: undefined };
        browserSessionService.createSession.mockRejectedValue(
          new Error('Session creation failed'),
        );

        const result = await controller.executeScript(executeDto, mockUser);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Session creation failed');
      });
    });

    describe('Security and Validation', () => {
      it('should log script content for audit purposes (truncated)', async () => {
        const longScript = 'console.log("test");'.repeat(100);
        const executeDto = { ...mockExecuteDto, script: longScript };

        browserUseService.executeScript.mockResolvedValue({
          output: 'success',
        });

        await controller.executeScript(executeDto, mockUser);

        // Verify script is truncated in logs
        expect(loggerSpy).toHaveBeenCalledWith(
          expect.stringContaining('Browser script execution requested'),
          expect.objectContaining({
            script: expect.stringContaining('...'),
          }),
        );
      });

      it('should include user context in all log entries', async () => {
        browserUseService.executeScript.mockResolvedValue({
          output: 'success',
        });

        await controller.executeScript(mockExecuteDto, mockUser);

        expect(loggerSpy).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            userId: mockUser.id,
          }),
        );
      });

      it('should handle malicious script content safely', async () => {
        const maliciousScript = '<script>alert("xss")</script>';
        const executeDto = { ...mockExecuteDto, script: maliciousScript };

        browserUseService.executeScript.mockResolvedValue({
          output: 'success',
        });

        const result = await controller.executeScript(executeDto, mockUser);

        expect(result.success).toBe(true);
        expect(browserUseService.executeScript).toHaveBeenCalledWith(
          maliciousScript,
          expect.any(String),
          expect.any(Object),
          expect.any(Boolean),
        );
      });
    });

    describe('Performance Requirements', () => {
      it('should complete endpoint processing within reasonable time', async () => {
        browserUseService.executeScript.mockResolvedValue({
          output: 'success',
        });

        const startTime = performance.now();
        await controller.executeScript(mockExecuteDto, mockUser);
        const endTime = performance.now();

        // Controller overhead should be minimal (< 100ms)
        expect(endTime - startTime).toBeLessThan(100);
      });

      it('should handle concurrent requests efficiently', async () => {
        browserUseService.executeScript.mockResolvedValue({
          output: 'success',
        });

        const requests = Array(5)
          .fill(null)
          .map(() => controller.executeScript(mockExecuteDto, mockUser));

        const results = await Promise.all(requests);

        results.forEach((result) => {
          expect(result.success).toBe(true);
        });

        expect(browserUseService.executeScript).toHaveBeenCalledTimes(5);
      });
    });
  });

  describe('navigate endpoint', () => {
    describe('Successful Navigation', () => {
      it('should navigate successfully with valid URL', async () => {
        const mockResult = {
          finalUrl: 'https://example.com',
          statusCode: 200,
          pageTitle: 'Example Domain',
          screenshot: 'base64screenshot',
        };

        browserUseService.navigate.mockResolvedValue(mockResult);

        const result = await controller.navigate(mockNavigateDto, mockUser);

        expect(result.success).toBe(true);
        expect(result.finalUrl).toBe(mockResult.finalUrl);
        expect(result.statusCode).toBe(mockResult.statusCode);
        expect(result.pageTitle).toBe(mockResult.pageTitle);
        expect(result.screenshot).toBe(mockResult.screenshot);
        expect(result.timing).toBeDefined();

        expect(browserUseService.navigate).toHaveBeenCalledWith(
          mockNavigateDto.url,
          mockNavigateDto.sessionId,
          mockNavigateDto.options,
          mockNavigateDto.captureScreenshot,
        );
      });

      it('should handle navigation without screenshot', async () => {
        const navigateDto = { ...mockNavigateDto, captureScreenshot: false };
        const mockResult = {
          finalUrl: 'https://example.com',
          statusCode: 200,
        };

        browserUseService.navigate.mockResolvedValue(mockResult);

        const result = await controller.navigate(navigateDto, mockUser);

        expect(result.success).toBe(true);
        expect(result.screenshot).toBeUndefined();
      });

      it('should handle redirects correctly', async () => {
        const mockResult = {
          finalUrl: 'https://redirected.com',
          statusCode: 200,
          pageTitle: 'Redirected Page',
        };

        browserUseService.navigate.mockResolvedValue(mockResult);

        const result = await controller.navigate(mockNavigateDto, mockUser);

        expect(result.success).toBe(true);
        expect(result.finalUrl).toBe('https://redirected.com');
        expect(result.statusCode).toBe(200);
      });
    });

    describe('Error Handling', () => {
      it('should handle navigation failures gracefully', async () => {
        const errorMessage = 'Navigation failed: DNS not found';
        browserUseService.navigate.mockRejectedValue(new Error(errorMessage));

        const result = await controller.navigate(mockNavigateDto, mockUser);

        expect(result.success).toBe(false);
        expect(result.error).toBe(errorMessage);
        expect(result.statusCode).toBe(0);
        expect(result.finalUrl).toBe(mockNavigateDto.url);
      });

      it('should handle timeout errors', async () => {
        browserUseService.navigate.mockRejectedValue(
          new Error('Navigation timeout'),
        );

        const result = await controller.navigate(mockNavigateDto, mockUser);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Navigation timeout');
      });
    });

    describe('URL Validation and Security', () => {
      it('should handle various URL formats', async () => {
        const urlFormats = [
          'https://example.com',
          'http://localhost:3000',
          'https://subdomain.example.com/path?query=value',
          'file:///local/file.html',
        ];

        for (const url of urlFormats) {
          const navigateDto = { ...mockNavigateDto, url };
          browserUseService.navigate.mockResolvedValue({
            finalUrl: url,
            statusCode: 200,
          });

          const result = await controller.navigate(navigateDto, mockUser);

          expect(result.success).toBe(true);
          expect(browserUseService.navigate).toHaveBeenCalledWith(
            url,
            expect.any(String),
            expect.any(Object),
            expect.any(Boolean),
          );
        }
      });

      it('should handle potentially malicious URLs', async () => {
        const maliciousUrls = [
          'javascript:alert("xss")',
          'data:text/html,<script>alert("xss")</script>',
          'https://malicious.com/redirect?to=javascript:alert("xss")',
        ];

        for (const url of maliciousUrls) {
          const navigateDto = { ...mockNavigateDto, url };
          browserUseService.navigate.mockRejectedValue(
            new Error('Blocked malicious URL'),
          );

          const result = await controller.navigate(navigateDto, mockUser);

          expect(result.success).toBe(false);
          expect(result.error).toBe('Blocked malicious URL');
        }
      });
    });
  });

  describe('wait endpoint', () => {
    describe('Successful Wait Operations', () => {
      it('should wait for element successfully', async () => {
        const mockResult = {
          data: { elementFound: true },
          actualWaitTime: 1500,
        };

        browserUseService.wait.mockResolvedValue(mockResult);

        const result = await controller.wait(mockWaitDto, mockUser);

        expect(result.success).toBe(true);
        expect(result.waitType).toBe(mockWaitDto.type);
        expect(result.result).toBe(mockResult.data);
        expect(result.timing.actualWaitTime).toBe(mockResult.actualWaitTime);

        expect(browserUseService.wait).toHaveBeenCalledWith(
          mockWaitDto.type,
          mockWaitDto.sessionId,
          {
            selector: mockWaitDto.selector,
            timeout: mockWaitDto.timeout,
            condition: mockWaitDto.condition,
            options: mockWaitDto.options,
          },
        );
      });

      it('should handle different wait types', async () => {
        const waitTypes = ['element', 'network', 'timeout', 'condition'];

        for (const waitType of waitTypes) {
          const waitDto = { ...mockWaitDto, type: waitType };
          const mockResult = {
            data: { success: true },
            actualWaitTime: 1000,
          };

          browserUseService.wait.mockResolvedValue(mockResult);

          const result = await controller.wait(waitDto, mockUser);

          expect(result.success).toBe(true);
          expect(result.waitType).toBe(waitType);
        }
      });

      it('should handle wait operations with varying timeouts', async () => {
        const timeouts = [1000, 5000, 10000, 30000];

        for (const timeout of timeouts) {
          const waitDto = { ...mockWaitDto, timeout };
          const mockResult = {
            data: { success: true },
            actualWaitTime: timeout / 2,
          };

          browserUseService.wait.mockResolvedValue(mockResult);

          const result = await controller.wait(waitDto, mockUser);

          expect(result.success).toBe(true);
          expect(result.timing.actualWaitTime).toBe(timeout / 2);
        }
      });
    });

    describe('Error Handling', () => {
      it('should handle wait timeout errors', async () => {
        const errorMessage = 'Wait operation timed out';
        browserUseService.wait.mockRejectedValue(new Error(errorMessage));

        const result = await controller.wait(mockWaitDto, mockUser);

        expect(result.success).toBe(false);
        expect(result.error).toBe(errorMessage);
        expect(result.waitType).toBe(mockWaitDto.type);
      });

      it('should handle element not found errors', async () => {
        browserUseService.wait.mockRejectedValue(
          new Error('Element not found'),
        );

        const result = await controller.wait(mockWaitDto, mockUser);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Element not found');
      });
    });
  });

  describe('getStatus endpoint', () => {
    describe('Successful Status Retrieval', () => {
      it('should get system health status successfully', async () => {
        const mockSystemHealth = {
          browserServiceRunning: true,
          activeSessions: 3,
          memoryUsage: '50MB',
          uptime: '2h 30m',
        };

        browserUseService.getSystemHealth.mockResolvedValue(mockSystemHealth);

        const result = await controller.getStatus(mockStatusDto, mockUser);

        expect(result.healthy).toBe(true);
        expect(result.system).toBe(mockSystemHealth);
        expect(result.timestamp).toBeInstanceOf(Date);
      });

      it('should get specific session status', async () => {
        const mockSystemHealth = {
          browserServiceRunning: true,
          activeSessions: 1,
        };
        const mockSessionStatus = {
          sessionId: 'test-session-123',
          active: true,
          lastActivity: new Date(),
        };

        browserUseService.getSystemHealth.mockResolvedValue(mockSystemHealth);
        browserSessionService.getSessionStatus.mockResolvedValue(
          mockSessionStatus,
        );

        const result = await controller.getStatus(mockStatusDto, mockUser);

        expect(result.healthy).toBe(true);
        expect(result.session).toBe(mockSessionStatus);
        expect(browserSessionService.getSessionStatus).toHaveBeenCalledWith(
          mockStatusDto.sessionId,
        );
      });

      it('should get all sessions when no specific session requested', async () => {
        const statusDto = { sessionId: undefined };
        const mockSystemHealth = {
          browserServiceRunning: true,
          activeSessions: 2,
        };
        const mockAllSessions = [
          { sessionId: 'session-1', active: true },
          { sessionId: 'session-2', active: false },
        ];

        browserUseService.getSystemHealth.mockResolvedValue(mockSystemHealth);
        browserSessionService.getAllSessions.mockResolvedValue(mockAllSessions);

        const result = await controller.getStatus(statusDto, mockUser);

        expect(result.healthy).toBe(true);
        expect(result.sessions).toBe(mockAllSessions);
        expect(browserSessionService.getAllSessions).toHaveBeenCalled();
      });
    });

    describe('Error Handling', () => {
      it('should throw HttpException on service errors', async () => {
        const errorMessage = 'System health check failed';
        browserUseService.getSystemHealth.mockRejectedValue(
          new Error(errorMessage),
        );

        await expect(
          controller.getStatus(mockStatusDto, mockUser),
        ).rejects.toThrow(HttpException);

        try {
          await controller.getStatus(mockStatusDto, mockUser);
        } catch (error) {
          expect(error).toBeInstanceOf(HttpException);
          expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
          expect(error.message).toContain(errorMessage);
        }
      });

      it('should handle unhealthy system status', async () => {
        const mockSystemHealth = {
          browserServiceRunning: false,
          activeSessions: 0,
        };

        browserUseService.getSystemHealth.mockResolvedValue(mockSystemHealth);

        const result = await controller.getStatus(mockStatusDto, mockUser);

        expect(result.healthy).toBe(false);
        expect(result.system.browserServiceRunning).toBe(false);
      });
    });
  });

  describe('captureScreenshot endpoint', () => {
    describe('Successful Screenshot Capture', () => {
      it('should capture screenshot successfully', async () => {
        const mockResult = {
          filePath: '/screenshots/test-123.png',
          base64Data:
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
          metadata: {
            width: 1920,
            height: 1080,
            format: 'png',
            size: 150,
          },
        };

        browserUseService.captureScreenshot.mockResolvedValue(mockResult);

        const result = await controller.captureScreenshot(
          mockScreenshotDto,
          mockUser,
        );

        expect(result.success).toBe(true);
        expect(result.filePath).toBe(mockResult.filePath);
        expect(result.base64Data).toBe(mockResult.base64Data);
        expect(result.metadata).toBe(mockResult.metadata);
        expect(result.timing).toBeDefined();

        expect(browserUseService.captureScreenshot).toHaveBeenCalledWith(
          mockScreenshotDto.sessionId,
          mockScreenshotDto.options,
          mockScreenshotDto.selector,
          mockScreenshotDto.returnBase64,
        );
      });

      it('should capture full page screenshot', async () => {
        const fullPageDto = {
          ...mockScreenshotDto,
          selector: undefined,
          options: { fullPage: true },
        };
        const mockResult = {
          filePath: '/screenshots/fullpage-123.png',
          metadata: { width: 1920, height: 3000 },
        };

        browserUseService.captureScreenshot.mockResolvedValue(mockResult);

        const result = await controller.captureScreenshot(
          fullPageDto,
          mockUser,
        );

        expect(result.success).toBe(true);
        expect(result.metadata?.height).toBe(3000);
      });

      it('should capture element screenshot without base64', async () => {
        const elementDto = {
          ...mockScreenshotDto,
          returnBase64: false,
        };
        const mockResult = {
          filePath: '/screenshots/element-123.png',
          base64Data: undefined,
          metadata: { width: 200, height: 100 },
        };

        browserUseService.captureScreenshot.mockResolvedValue(mockResult);

        const result = await controller.captureScreenshot(elementDto, mockUser);

        expect(result.success).toBe(true);
        expect(result.base64Data).toBeUndefined();
        expect(result.filePath).toBe(mockResult.filePath);
      });
    });

    describe('Error Handling', () => {
      it('should handle screenshot capture failures', async () => {
        const errorMessage = 'Element not found for screenshot';
        browserUseService.captureScreenshot.mockRejectedValue(
          new Error(errorMessage),
        );

        const result = await controller.captureScreenshot(
          mockScreenshotDto,
          mockUser,
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe(errorMessage);
        expect(result.timing).toBeDefined();
      });

      it('should handle storage errors', async () => {
        browserUseService.captureScreenshot.mockRejectedValue(
          new Error('Disk full'),
        );

        const result = await controller.captureScreenshot(
          mockScreenshotDto,
          mockUser,
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('Disk full');
      });
    });
  });

  describe('performInteraction endpoint', () => {
    describe('Successful Interactions', () => {
      it('should perform click interaction successfully', async () => {
        const mockResult = {
          data: { clicked: true },
          elementInfo: {
            tagName: 'BUTTON',
            id: 'test-button',
            className: 'btn btn-primary',
          },
          screenshot: 'base64screenshot',
        };

        browserInteractionService.performInteraction.mockResolvedValue(
          mockResult,
        );

        const result = await controller.performInteraction(
          mockInteractionDto,
          mockUser,
        );

        expect(result.success).toBe(true);
        expect(result.interactionType).toBe(mockInteractionDto.type);
        expect(result.result).toBe(mockResult.data);
        expect(result.elementInfo).toBe(mockResult.elementInfo);
        expect(result.timing).toBeDefined();

        expect(
          browserInteractionService.performInteraction,
        ).toHaveBeenCalledWith(
          mockInteractionDto.type,
          mockInteractionDto.selector,
          mockInteractionDto.sessionId,
          {
            value: mockInteractionDto.value,
            options: mockInteractionDto.options,
            formData: mockInteractionDto.formData,
            targetSelector: mockInteractionDto.targetSelector,
            captureScreenshot: mockInteractionDto.captureScreenshot,
          },
        );
      });

      it('should handle type interaction with value', async () => {
        const typeDto = {
          ...mockInteractionDto,
          type: 'type',
          selector: '#email-input',
          value: 'test@example.com',
        };
        const mockResult = {
          data: { typed: true, value: 'test@example.com' },
          elementInfo: { tagName: 'INPUT', type: 'email' },
        };

        browserInteractionService.performInteraction.mockResolvedValue(
          mockResult,
        );

        const result = await controller.performInteraction(typeDto, mockUser);

        expect(result.success).toBe(true);
        expect(result.interactionType).toBe('type');
        expect(result.result.value).toBe('test@example.com');
      });

      it('should handle hover interaction', async () => {
        const hoverDto = {
          ...mockInteractionDto,
          type: 'hover',
          selector: '.dropdown-trigger',
        };
        const mockResult = {
          data: { hovered: true },
          elementInfo: { tagName: 'DIV', className: 'dropdown-trigger' },
        };

        browserInteractionService.performInteraction.mockResolvedValue(
          mockResult,
        );

        const result = await controller.performInteraction(hoverDto, mockUser);

        expect(result.success).toBe(true);
        expect(result.interactionType).toBe('hover');
      });

      it('should handle drag and drop interaction', async () => {
        const dragDropDto = {
          ...mockInteractionDto,
          type: 'drag',
          selector: '.draggable',
          targetSelector: '.drop-zone',
        };
        const mockResult = {
          data: { dragged: true, dropped: true },
          elementInfo: { tagName: 'DIV' },
        };

        browserInteractionService.performInteraction.mockResolvedValue(
          mockResult,
        );

        const result = await controller.performInteraction(
          dragDropDto,
          mockUser,
        );

        expect(result.success).toBe(true);
        expect(result.interactionType).toBe('drag');
      });
    });

    describe('Error Handling', () => {
      it('should handle element not found errors', async () => {
        const errorMessage = 'Element not found: #non-existent-button';
        browserInteractionService.performInteraction.mockRejectedValue(
          new Error(errorMessage),
        );

        const result = await controller.performInteraction(
          mockInteractionDto,
          mockUser,
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe(errorMessage);
        expect(result.interactionType).toBe(mockInteractionDto.type);
      });

      it('should handle interaction timeout errors', async () => {
        browserInteractionService.performInteraction.mockRejectedValue(
          new Error('Interaction timeout'),
        );

        const result = await controller.performInteraction(
          mockInteractionDto,
          mockUser,
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('Interaction timeout');
      });

      it('should handle invalid selector errors', async () => {
        const invalidDto = {
          ...mockInteractionDto,
          selector: '!!!invalid-selector!!',
        };

        browserInteractionService.performInteraction.mockRejectedValue(
          new Error('Invalid selector'),
        );

        const result = await controller.performInteraction(
          invalidDto,
          mockUser,
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid selector');
      });
    });
  });

  describe('Controller-wide Security and Performance', () => {
    describe('Logging and Audit Trail', () => {
      it('should log all operations with operation IDs', async () => {
        browserUseService.executeScript.mockResolvedValue({
          output: 'success',
        });

        await controller.executeScript(mockExecuteDto, mockUser);

        expect(loggerSpy).toHaveBeenCalledWith(
          expect.stringContaining('[execute_'),
          expect.any(Object),
        );
      });

      it('should include timing information in logs', async () => {
        browserUseService.executeScript.mockResolvedValue({
          output: 'success',
        });

        await controller.executeScript(mockExecuteDto, mockUser);

        expect(loggerSpy).toHaveBeenCalledWith(
          expect.stringContaining('completed successfully'),
          expect.objectContaining({
            duration: expect.any(Number),
          }),
        );
      });

      it('should log errors with full context', async () => {
        const errorSpy = jest.spyOn(Logger.prototype, 'error');
        browserUseService.executeScript.mockRejectedValue(
          new Error('Test error'),
        );

        await controller.executeScript(mockExecuteDto, mockUser);

        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('failed'),
          expect.objectContaining({
            userId: mockUser.id,
            error: 'Test error',
          }),
        );
      });
    });

    describe('Performance Requirements', () => {
      it('should handle high concurrency across all endpoints', async () => {
        // Mock all services to return quickly
        browserUseService.executeScript.mockResolvedValue({
          output: 'success',
        });
        browserUseService.navigate.mockResolvedValue({
          finalUrl: 'https://example.com',
          statusCode: 200,
        });
        browserUseService.wait.mockResolvedValue({
          data: {},
          actualWaitTime: 100,
        });
        browserUseService.getSystemHealth.mockResolvedValue({
          browserServiceRunning: true,
          activeSessions: 0,
        });
        browserUseService.captureScreenshot.mockResolvedValue({
          filePath: '/test.png',
        });
        browserInteractionService.performInteraction.mockResolvedValue({
          data: {},
        });

        // Create concurrent requests to different endpoints
        const requests = [
          controller.executeScript(mockExecuteDto, mockUser),
          controller.navigate(mockNavigateDto, mockUser),
          controller.wait(mockWaitDto, mockUser),
          controller.getStatus(mockStatusDto, mockUser),
          controller.captureScreenshot(mockScreenshotDto, mockUser),
          controller.performInteraction(mockInteractionDto, mockUser),
        ];

        const startTime = performance.now();
        const results = await Promise.all(requests);
        const endTime = performance.now();

        // All requests should complete successfully
        results.forEach((result) => {
          expect(result.success || result.healthy).toBe(true);
        });

        // Controller should handle concurrent requests efficiently
        expect(endTime - startTime).toBeLessThan(500);
      });

      it('should maintain response time under load', async () => {
        browserUseService.executeScript.mockResolvedValue({
          output: 'success',
        });

        const requests = Array(20)
          .fill(null)
          .map(() => controller.executeScript(mockExecuteDto, mockUser));

        const startTime = performance.now();
        const results = await Promise.all(requests);
        const endTime = performance.now();

        results.forEach((result) => {
          expect(result.success).toBe(true);
        });

        // Average response time should be reasonable
        const averageTime = (endTime - startTime) / requests.length;
        expect(averageTime).toBeLessThan(50); // < 50ms per request
      });
    });

    describe('Memory Management', () => {
      it('should not create memory leaks during intensive operations', async () => {
        const initialMemory = process.memoryUsage();

        // Mock all services
        browserUseService.executeScript.mockResolvedValue({
          output: 'success',
        });
        browserUseService.navigate.mockResolvedValue({
          finalUrl: 'https://example.com',
          statusCode: 200,
        });

        // Execute many operations
        for (let i = 0; i < 100; i++) {
          await controller.executeScript(mockExecuteDto, mockUser);
          await controller.navigate(mockNavigateDto, mockUser);
        }

        const finalMemory = process.memoryUsage();
        const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

        // Memory increase should be reasonable (< 50MB for 200 operations)
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      });
    });
  });
});
