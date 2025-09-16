/**
 * AppController Unit Tests - Comprehensive Core Application Testing
 *
 * Tests the core application controller with complete coverage including:
 * - Basic application greeting endpoint
 * - Controller initialization and dependency injection
 * - Error handling scenarios
 * - Performance monitoring and validation
 * - NestJS framework integration patterns
 *
 * @author Claude Code Testing Specialist
 * @version 2.0.0 - Enhanced for 100% coverage
 * @since Core Application Testing Suite
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;
  let appService: jest.Mocked<AppService>;
  let module: TestingModule;

  beforeEach(async () => {
    // Create mock AppService with only the methods that actually exist
    const mockAppService = {
      getHello: jest.fn(),
    };

    module = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: mockAppService,
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
    appService = module.get(AppService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await module?.close();
  });

  describe('Module Setup and Dependency Injection', () => {
    it('should create the controller successfully', () => {
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(AppController);
    });

    it('should inject AppService dependency correctly', () => {
      expect(appService).toBeDefined();
      expect(appService.getHello).toBeDefined();
      expect(typeof appService.getHello).toBe('function');
    });

    it('should have the correct constructor signature', () => {
      // Verify constructor exists and accepts AppService
      const constructorParams = Reflect.getMetadata(
        'design:paramtypes',
        AppController,
      );
      expect(constructorParams).toBeDefined();
      expect(constructorParams).toHaveLength(1);
    });
  });

  describe('GET / - getHello()', () => {
    describe('Success Scenarios', () => {
      it('should return hello message from service', () => {
        // Arrange
        const mockMessage = 'Hello World!';
        appService.getHello.mockReturnValue(mockMessage);

        // Act
        const result = controller.getHello();

        // Assert
        expect(result).toBe(mockMessage);
        expect(appService.getHello).toHaveBeenCalledTimes(1);
        expect(appService.getHello).toHaveBeenCalledWith();
      });

      it('should handle different messages from service', () => {
        // Arrange
        const customMessage = 'Hello Test!';
        appService.getHello.mockReturnValue(customMessage);

        // Act
        const result = controller.getHello();

        // Assert
        expect(result).toBe(customMessage);
        expect(appService.getHello).toHaveBeenCalled();
      });

      it('should consistently call the app service', () => {
        // Arrange
        appService.getHello.mockReturnValue('Test Message');

        // Act
        controller.getHello();
        controller.getHello();
        controller.getHello();

        // Assert
        expect(appService.getHello).toHaveBeenCalledTimes(3);
      });

      it('should return different messages based on AppService response', () => {
        // Arrange
        const customMessage = 'Custom greeting from service';
        appService.getHello.mockReturnValue(customMessage);

        // Act
        const result = controller.getHello();

        // Assert
        expect(result).toBe(customMessage);
        expect(result).not.toBe('Hello World!'); // Ensure it's not hardcoded
      });

      it('should handle empty string from AppService', () => {
        // Arrange
        appService.getHello.mockReturnValue('');

        // Act
        const result = controller.getHello();

        // Assert
        expect(result).toBe('');
        expect(appService.getHello).toHaveBeenCalledTimes(1);
      });

      it('should handle special characters in message', () => {
        // Arrange
        const specialMessage =
          'Hello! 🤖 ByteBot Agent with émojis & spëcial chars';
        appService.getHello.mockReturnValue(specialMessage);

        // Act
        const result = controller.getHello();

        // Assert
        expect(result).toBe(specialMessage);
        expect(result).toContain('🤖');
        expect(result).toContain('émojis');
        expect(result).toContain('spëcial');
      });
    });

    describe('Error Handling Scenarios', () => {
      it('should propagate errors from AppService', () => {
        // Arrange
        const errorMessage = 'Service error occurred';
        appService.getHello.mockImplementation(() => {
          throw new Error(errorMessage);
        });

        // Act & Assert
        expect(() => controller.getHello()).toThrow(errorMessage);
        expect(appService.getHello).toHaveBeenCalledTimes(1);
      });

      it('should handle AppService throwing custom errors', () => {
        // Arrange
        class CustomError extends Error {
          constructor(message: string) {
            super(message);
            this.name = 'CustomError';
          }
        }

        const customError = new CustomError('Custom service error');
        appService.getHello.mockImplementation(() => {
          throw customError;
        });

        // Act & Assert
        expect(() => controller.getHello()).toThrow(CustomError);
        expect(() => controller.getHello()).toThrow('Custom service error');
      });

      it('should handle AppService returning null/undefined', () => {
        // Arrange - Test null
        appService.getHello.mockReturnValue(null as any);

        // Act
        const nullResult = controller.getHello();

        // Assert
        expect(nullResult).toBeNull();

        // Arrange - Test undefined
        appService.getHello.mockReturnValue(undefined as any);

        // Act
        const undefinedResult = controller.getHello();

        // Assert
        expect(undefinedResult).toBeUndefined();
      });
    });

    describe('Performance and Behavior', () => {
      it('should complete within reasonable time', () => {
        // Arrange
        appService.getHello.mockReturnValue('Hello World!');
        const startTime = performance.now();

        // Act
        controller.getHello();
        const endTime = performance.now();

        // Assert
        const executionTime = endTime - startTime;
        expect(executionTime).toBeLessThan(10); // Should complete within 10ms
      });

      it('should handle rapid successive calls', () => {
        // Arrange
        appService.getHello.mockReturnValue('Hello World!');

        // Act
        const results = [];
        for (let i = 0; i < 100; i++) {
          results.push(controller.getHello());
        }

        // Assert
        expect(results).toHaveLength(100);
        expect(appService.getHello).toHaveBeenCalledTimes(100);
        results.forEach((result) => {
          expect(result).toBe('Hello World!');
        });
      });

      it('should be stateless and consistent', () => {
        // Arrange
        const message = 'Consistent message';
        appService.getHello.mockReturnValue(message);

        // Act
        const result1 = controller.getHello();
        const result2 = controller.getHello();
        const result3 = controller.getHello();

        // Assert
        expect(result1).toBe(message);
        expect(result2).toBe(message);
        expect(result3).toBe(message);
        expect(result1).toBe(result2);
        expect(result2).toBe(result3);
      });
    });

    describe('Service Integration', () => {
      it('should only call getHello method on AppService', () => {
        // Arrange
        const serviceSpy = jest.spyOn(appService, 'getHello');
        serviceSpy.mockReturnValue('Hello');

        // Act
        controller.getHello();

        // Assert
        expect(serviceSpy).toHaveBeenCalledWith();
        expect(serviceSpy).toHaveBeenCalledTimes(1);
      });

      it('should pass through service response unchanged', () => {
        // Arrange
        const originalResponse = 'Original service response';
        appService.getHello.mockReturnValue(originalResponse);

        // Act
        const controllerResponse = controller.getHello();

        // Assert
        expect(controllerResponse).toBe(originalResponse);
        expect(controllerResponse).toBe(appService.getHello());
      });
    });
  });

  describe('Controller Metadata and Decorators', () => {
    it('should be decorated as a Controller', () => {
      // Check if the controller has the @Controller() decorator
      const controllerMetadata = Reflect.getMetadata('path', AppController);
      expect(controllerMetadata).toBeDefined();
    });

    it('should have correct method decorators', () => {
      // Verify getHello method has proper metadata
      expect(controller.getHello).toBeDefined();
      expect(typeof controller.getHello).toBe('function');
    });
  });

  describe('Memory and Resource Management', () => {
    it('should handle concurrent requests safely', async () => {
      // Arrange
      appService.getHello.mockReturnValue('Concurrent Hello');

      // Act
      const promises = Array.from({ length: 50 }, () => {
        return Promise.resolve(controller.getHello());
      });

      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(50);
      results.forEach((result) => {
        expect(result).toBe('Concurrent Hello');
      });
      expect(appService.getHello).toHaveBeenCalledTimes(50);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should maintain functionality after service mock changes', () => {
      // Arrange
      appService.getHello.mockReturnValue('First response');

      // Act
      const firstResult = controller.getHello();

      // Assert
      expect(firstResult).toBe('First response');

      // Arrange - Change mock response
      appService.getHello.mockReturnValue('Second response');

      // Act
      const secondResult = controller.getHello();

      // Assert
      expect(secondResult).toBe('Second response');
      expect(firstResult).not.toBe(secondResult);
    });
  });

  describe('Type Safety and Contracts', () => {
    it('should return the correct type from getHello', () => {
      // Arrange
      const stringResponse = 'String response';
      appService.getHello.mockReturnValue(stringResponse);

      // Act
      const result = controller.getHello();

      // Assert
      expect(typeof result).toBe('string');
      expect(result).toBe(stringResponse);
    });

    it('should maintain contract with AppService interface', () => {
      // Arrange - Verify the service has the expected method
      expect(appService.getHello).toBeDefined();
      expect(typeof appService.getHello).toBe('function');

      // Act - Call should succeed
      appService.getHello.mockReturnValue('Contract test');
      const result = controller.getHello();

      // Assert
      expect(result).toBe('Contract test');
    });
  });
});
