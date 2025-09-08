/**
 * App Controller Unit Tests - Testing for actual AppController implementation
 * Tests the main application endpoint functionality
 *
 * @author Testing & Quality Assurance Specialist
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: jest.Mocked<AppService>;

  beforeEach(async () => {
    // Create mock AppService with only the methods that actually exist
    const mockAppService = {
      getHello: jest.fn(),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: mockAppService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get(AppService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getHello', () => {
    it('should return hello message from service', () => {
      // Arrange
      const mockMessage = 'Hello World!';
      appService.getHello.mockReturnValue(mockMessage);

      // Act
      const result = appController.getHello();

      // Assert
      expect(result).toBe(mockMessage);
      expect(appService.getHello).toHaveBeenCalledTimes(1);
    });

    it('should handle different messages from service', () => {
      // Arrange
      const customMessage = 'Hello Test!';
      appService.getHello.mockReturnValue(customMessage);

      // Act
      const result = appController.getHello();

      // Assert
      expect(result).toBe(customMessage);
      expect(appService.getHello).toHaveBeenCalled();
    });

    it('should consistently call the app service', () => {
      // Arrange
      appService.getHello.mockReturnValue('Test Message');

      // Act
      appController.getHello();
      appController.getHello();
      appController.getHello();

      // Assert
      expect(appService.getHello).toHaveBeenCalledTimes(3);
    });
  });
});
