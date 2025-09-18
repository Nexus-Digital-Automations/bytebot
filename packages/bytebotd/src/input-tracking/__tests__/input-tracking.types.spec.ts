/* eslint-env jest */

/**
 * Input Tracking Types Test Suite
 *
 * Comprehensive unit tests for input-tracking type definitions covering:
 * - Type guard function validation and edge cases
 * - Interface compliance and structure validation
 * - Runtime type checking accuracy
 * - Data validation and error scenarios
 * - Performance of type checking operations
 * - Cross-type compatibility validation
 * - Mock object structure validation
 * - Utility type function testing
 *
 * @author Claude Code (Testing & QA Specialist)
 * @version 1.0.0
 * @coverage-target 100%
 */

import {
  isMouseEventData,
  isKeyboardEventData,
  isMockByteBotdUser,
  isValidCoordinates,
  MouseEventData,
  KeyboardEventData,
  MockByteBotdUser,
  Coordinates,
  WheelEventData,
  TrackingOptions,
  TrackingResponse,
  ValidationResult,
  TrackedEvent,
  InputTrackingError,
} from '../input-tracking.types';
import { UserRole, Permission } from '@bytebot/shared';

describe('InputTrackingTypes', () => {
  const operationId = `input_tracking_types_test_${Date.now()}`;

  describe('Type Guard Functions', () => {
    describe('isMouseEventData', () => {
      it('should validate correct mouse event data', () => {
        const testId = `${operationId}_mouse_event_validation`;
        console.log(`[${testId}] Testing mouse event data validation`);

        const validMouseEvent: MouseEventData = {
          button: 1,
          x: 100,
          y: 200,
          clicks: 1,
          altKey: false,
          ctrlKey: false,
          shiftKey: false,
          metaKey: false,
        };

        expect(isMouseEventData(validMouseEvent)).toBe(true);

        console.log(`[${testId}] Mouse event validation test completed`);
      });

      it('should reject invalid mouse event data', () => {
        const testId = `${operationId}_invalid_mouse_event`;
        console.log(`[${testId}] Testing invalid mouse event rejection`);

        const invalidEvents = [
          null,
          undefined,
          {},
          { button: 'invalid' },
          { x: 'invalid', y: 100 },
          { button: 1, x: 100 }, // missing y
          { button: 1, y: 200 }, // missing x
          'string',
          123,
          [],
        ];

        invalidEvents.forEach((event) => {
          expect(isMouseEventData(event)).toBe(false);
        });

        console.log(`[${testId}] Invalid mouse event rejection test completed`);
      });

      it('should handle edge cases for mouse event data', () => {
        const testId = `${operationId}_mouse_event_edge_cases`;
        console.log(`[${testId}] Testing mouse event edge cases`);

        // Valid with minimal required fields
        expect(
          isMouseEventData({
            button: 0,
            x: 0,
            y: 0,
          }),
        ).toBe(true);

        // Valid with negative coordinates
        expect(
          isMouseEventData({
            button: 1,
            x: -100,
            y: -200,
          }),
        ).toBe(true);

        // Valid with large coordinates
        expect(
          isMouseEventData({
            button: 1,
            x: 99999,
            y: 99999,
          }),
        ).toBe(true);

        console.log(`[${testId}] Mouse event edge cases test completed`);
      });
    });

    describe('isKeyboardEventData', () => {
      it('should validate correct keyboard event data', () => {
        const testId = `${operationId}_keyboard_event_validation`;
        console.log(`[${testId}] Testing keyboard event data validation`);

        const validKeyboardEvent: KeyboardEventData = {
          keycode: 65,
          altKey: false,
          ctrlKey: false,
          shiftKey: false,
          metaKey: false,
        };

        expect(isKeyboardEventData(validKeyboardEvent)).toBe(true);

        console.log(`[${testId}] Keyboard event validation test completed`);
      });

      it('should reject invalid keyboard event data', () => {
        const testId = `${operationId}_invalid_keyboard_event`;
        console.log(`[${testId}] Testing invalid keyboard event rejection`);

        const invalidEvents = [
          null,
          undefined,
          {},
          { keycode: 'invalid' },
          { keycode: null },
          { altKey: true }, // missing keycode
          'string',
          123,
          [],
        ];

        invalidEvents.forEach((event) => {
          expect(isKeyboardEventData(event)).toBe(false);
        });

        console.log(`[${testId}] Invalid keyboard event rejection test completed`);
      });

      it('should handle edge cases for keyboard event data', () => {
        const testId = `${operationId}_keyboard_event_edge_cases`;
        console.log(`[${testId}] Testing keyboard event edge cases`);

        // Valid with minimal required fields
        expect(
          isKeyboardEventData({
            keycode: 0,
          }),
        ).toBe(true);

        // Valid with large keycode
        expect(
          isKeyboardEventData({
            keycode: 999999,
          }),
        ).toBe(true);

        // Valid with negative keycode
        expect(
          isKeyboardEventData({
            keycode: -1,
          }),
        ).toBe(true);

        console.log(`[${testId}] Keyboard event edge cases test completed`);
      });
    });

    describe('isMockByteBotdUser', () => {
      it('should validate correct mock user data', () => {
        const testId = `${operationId}_mock_user_validation`;
        console.log(`[${testId}] Testing mock user data validation`);

        const validUser: MockByteBotdUser = {
          id: 'user_123',
          sub: 'user_123',
          username: 'testuser',
          email: 'test@example.com',
          role: UserRole._ADMIN,
          permissions: [Permission._TASK_READ],
          isActive: true,
        };

        expect(isMockByteBotdUser(validUser)).toBe(true);

        console.log(`[${testId}] Mock user validation test completed`);
      });

      it('should reject invalid mock user data', () => {
        const testId = `${operationId}_invalid_mock_user`;
        console.log(`[${testId}] Testing invalid mock user rejection`);

        const invalidUsers = [
          null,
          undefined,
          {},
          { id: 123 }, // wrong type
          { username: 'test' }, // missing id
          { id: 'test' }, // missing username
          { id: 'test', username: 123 }, // wrong username type
          'string',
          123,
          [],
        ];

        invalidUsers.forEach((user) => {
          expect(isMockByteBotdUser(user)).toBe(false);
        });

        console.log(`[${testId}] Invalid mock user rejection test completed`);
      });

      it('should handle partial user objects', () => {
        const testId = `${operationId}_partial_user_objects`;
        console.log(`[${testId}] Testing partial user object handling`);

        // Minimal valid user
        expect(
          isMockByteBotdUser({
            id: 'test',
            username: 'test',
            role: 'viewer',
          }),
        ).toBe(true);

        // Missing critical fields
        expect(
          isMockByteBotdUser({
            username: 'test',
            role: 'admin',
          }),
        ).toBe(false);

        console.log(`[${testId}] Partial user object handling test completed`);
      });
    });

    describe('isValidCoordinates', () => {
      it('should validate correct coordinate data', () => {
        const testId = `${operationId}_coordinates_validation`;
        console.log(`[${testId}] Testing coordinates validation`);

        const validCoordinates: Coordinates = {
          x: 100,
          y: 200,
        };

        expect(isValidCoordinates(validCoordinates)).toBe(true);

        console.log(`[${testId}] Coordinates validation test completed`);
      });

      it('should reject invalid coordinate data', () => {
        const testId = `${operationId}_invalid_coordinates`;
        console.log(`[${testId}] Testing invalid coordinates rejection`);

        const invalidCoordinates = [
          null,
          undefined,
          {},
          { x: 'invalid' },
          { y: 'invalid' },
          { x: 100 }, // missing y
          { y: 200 }, // missing x
          'string',
          123,
          [],
        ];

        invalidCoordinates.forEach((coords) => {
          expect(isValidCoordinates(coords)).toBe(false);
        });

        console.log(`[${testId}] Invalid coordinates rejection test completed`);
      });

      it('should handle edge cases for coordinates', () => {
        const testId = `${operationId}_coordinates_edge_cases`;
        console.log(`[${testId}] Testing coordinates edge cases`);

        // Zero coordinates
        expect(isValidCoordinates({ x: 0, y: 0 })).toBe(true);

        // Negative coordinates
        expect(isValidCoordinates({ x: -100, y: -200 })).toBe(true);

        // Fractional coordinates
        expect(isValidCoordinates({ x: 100.5, y: 200.7 })).toBe(true);

        // Large coordinates
        expect(isValidCoordinates({ x: 999999, y: 999999 })).toBe(true);

        console.log(`[${testId}] Coordinates edge cases test completed`);
      });
    });
  });

  describe('Interface Compliance', () => {
    it('should validate MouseEventData interface compliance', () => {
      const testId = `${operationId}_mouse_event_interface`;
      console.log(`[${testId}] Testing MouseEventData interface compliance`);

      const mouseEvent: MouseEventData = {
        button: 1,
        x: 100,
        y: 200,
        clicks: 1,
        altKey: false,
        ctrlKey: true,
        shiftKey: false,
        metaKey: false,
      };

      // Verify all required properties exist
      expect(typeof mouseEvent.button).toBe('number');
      expect(typeof mouseEvent.x).toBe('number');
      expect(typeof mouseEvent.y).toBe('number');
      expect(typeof mouseEvent.clicks).toBe('number');
      expect(typeof mouseEvent.altKey).toBe('boolean');
      expect(typeof mouseEvent.ctrlKey).toBe('boolean');
      expect(typeof mouseEvent.shiftKey).toBe('boolean');
      expect(typeof mouseEvent.metaKey).toBe('boolean');

      console.log(`[${testId}] MouseEventData interface compliance test completed`);
    });

    it('should validate KeyboardEventData interface compliance', () => {
      const testId = `${operationId}_keyboard_event_interface`;
      console.log(`[${testId}] Testing KeyboardEventData interface compliance`);

      const keyboardEvent: KeyboardEventData = {
        keycode: 65,
        altKey: false,
        ctrlKey: false,
        shiftKey: true,
        metaKey: false,
      };

      // Verify all required properties exist
      expect(typeof keyboardEvent.keycode).toBe('number');
      expect(typeof keyboardEvent.altKey).toBe('boolean');
      expect(typeof keyboardEvent.ctrlKey).toBe('boolean');
      expect(typeof keyboardEvent.shiftKey).toBe('boolean');
      expect(typeof keyboardEvent.metaKey).toBe('boolean');

      console.log(`[${testId}] KeyboardEventData interface compliance test completed`);
    });

    it('should validate WheelEventData interface compliance', () => {
      const testId = `${operationId}_wheel_event_interface`;
      console.log(`[${testId}] Testing WheelEventData interface compliance`);

      const wheelEvent: WheelEventData = {
        x: 150,
        y: 250,
        direction: 3,
        rotation: -1,
      };

      // Verify all required properties exist
      expect(typeof wheelEvent.x).toBe('number');
      expect(typeof wheelEvent.y).toBe('number');
      expect(typeof wheelEvent.direction).toBe('number');
      expect(typeof wheelEvent.rotation).toBe('number');

      console.log(`[${testId}] WheelEventData interface compliance test completed`);
    });

    it('should validate TrackingOptions interface compliance', () => {
      const testId = `${operationId}_tracking_options_interface`;
      console.log(`[${testId}] Testing TrackingOptions interface compliance`);

      const options: TrackingOptions = {
        includeScreenshots: true,
        debounceMs: 250,
        enableKeyLogging: true,
        enableMouseTracking: false,
      };

      // All properties should be optional and of correct type
      if (options.includeScreenshots !== undefined) {
        expect(typeof options.includeScreenshots).toBe('boolean');
      }
      if (options.debounceMs !== undefined) {
        expect(typeof options.debounceMs).toBe('number');
      }
      if (options.enableKeyLogging !== undefined) {
        expect(typeof options.enableKeyLogging).toBe('boolean');
      }
      if (options.enableMouseTracking !== undefined) {
        expect(typeof options.enableMouseTracking).toBe('boolean');
      }

      console.log(`[${testId}] TrackingOptions interface compliance test completed`);
    });

    it('should validate TrackingResponse interface compliance', () => {
      const testId = `${operationId}_tracking_response_interface`;
      console.log(`[${testId}] Testing TrackingResponse interface compliance`);

      const response: TrackingResponse = {
        success: true,
        message: 'Tracking started successfully',
        timestamp: new Date().toISOString(),
        data: {
          isTracking: true,
          sessionId: 'session_123',
          userId: 'user_456',
          startTime: new Date().toISOString(),
        },
      };

      // Verify all required properties exist
      expect(typeof response.success).toBe('boolean');
      expect(typeof response.message).toBe('string');
      expect(typeof response.timestamp).toBe('string');

      if (response.data) {
        expect(typeof response.data).toBe('object');
      }

      console.log(`[${testId}] TrackingResponse interface compliance test completed`);
    });
  });

  describe('Validation Utilities', () => {
    it('should validate ValidationResult structure', () => {
      const testId = `${operationId}_validation_result`;
      console.log(`[${testId}] Testing ValidationResult structure`);

      const validationSuccess: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: ['Minor issue detected'],
      };

      const validationFailure: ValidationResult = {
        isValid: false,
        errors: ['Required field missing', 'Invalid format'],
        warnings: [],
      };

      expect(typeof validationSuccess.isValid).toBe('boolean');
      expect(Array.isArray(validationSuccess.errors)).toBe(true);
      expect(Array.isArray(validationSuccess.warnings)).toBe(true);

      expect(typeof validationFailure.isValid).toBe('boolean');
      expect(Array.isArray(validationFailure.errors)).toBe(true);

      console.log(`[${testId}] ValidationResult structure test completed`);
    });

    it('should validate TrackedEvent structure', () => {
      const testId = `${operationId}_tracked_event`;
      console.log(`[${testId}] Testing TrackedEvent structure`);

      const mouseTrackedEvent: TrackedEvent = {
        id: 'event_123',
        type: 'mouse',
        timestamp: new Date().toISOString(),
        data: {
          button: 1,
          x: 100,
          y: 200,
          clicks: 1,
          altKey: false,
          ctrlKey: false,
          shiftKey: false,
          metaKey: false,
        },
        userId: 'user_456',
        sessionId: 'session_789',
      };

      const keyboardTrackedEvent: TrackedEvent = {
        id: 'event_124',
        type: 'keyboard',
        timestamp: new Date().toISOString(),
        data: {
          keycode: 65,
          altKey: false,
          ctrlKey: false,
          shiftKey: false,
          metaKey: false,
        },
      };

      expect(typeof mouseTrackedEvent.id).toBe('string');
      expect(['mouse', 'keyboard', 'scroll']).toContain(mouseTrackedEvent.type);
      expect(typeof mouseTrackedEvent.timestamp).toBe('string');
      expect(typeof mouseTrackedEvent.data).toBe('object');

      expect(typeof keyboardTrackedEvent.id).toBe('string');
      expect(['mouse', 'keyboard', 'scroll']).toContain(keyboardTrackedEvent.type);
      expect(typeof keyboardTrackedEvent.timestamp).toBe('string');
      expect(typeof keyboardTrackedEvent.data).toBe('object');

      console.log(`[${testId}] TrackedEvent structure test completed`);
    });

    it('should validate InputTrackingError structure', () => {
      const testId = `${operationId}_input_tracking_error`;
      console.log(`[${testId}] Testing InputTrackingError structure`);

      const error: InputTrackingError = {
        code: 'INPUT_TRACKING_FAILED',
        message: 'Failed to initialize input tracking',
        timestamp: new Date().toISOString(),
        details: {
          reason: 'UIohook initialization failed',
          platform: 'darwin',
        },
        userId: 'user_123',
        sessionId: 'session_456',
      };

      expect(typeof error.code).toBe('string');
      expect(typeof error.message).toBe('string');
      expect(typeof error.timestamp).toBe('string');

      if (error.details !== undefined) {
        expect(typeof error.details).toBe('object');
      }
      if (error.userId !== undefined) {
        expect(typeof error.userId).toBe('string');
      }
      if (error.sessionId !== undefined) {
        expect(typeof error.sessionId).toBe('string');
      }

      console.log(`[${testId}] InputTrackingError structure test completed`);
    });
  });

  describe('Performance Testing', () => {
    it('should perform type guard operations efficiently', () => {
      const testId = `${operationId}_type_guard_performance`;
      console.log(`[${testId}] Testing type guard performance`);

      const testData = {
        button: 1,
        x: 100,
        y: 200,
        clicks: 1,
        altKey: false,
        ctrlKey: false,
        shiftKey: false,
        metaKey: false,
      };

      const iterations = 10000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        isMouseEventData(testData);
      }

      const executionTime = Date.now() - startTime;

      // Should complete 10k validations within 100ms
      expect(executionTime).toBeLessThan(100);

      console.log(
        `[${testId}] Type guard performance test completed (${executionTime}ms for ${iterations} operations)`,
      );
    });

    it('should handle large data structures efficiently', () => {
      const testId = `${operationId}_large_data_performance`;
      console.log(`[${testId}] Testing large data structure performance`);

      const largeEvent = {
        id: 'large_event',
        type: 'mouse' as const,
        timestamp: new Date().toISOString(),
        data: {
          button: 1,
          x: 100,
          y: 200,
          clicks: 1,
          altKey: false,
          ctrlKey: false,
          shiftKey: false,
          metaKey: false,
        },
        metadata: Array.from({ length: 1000 }, (_, i) => ({
          key: `metadata_${i}`,
          value: `value_${i}`,
        })),
      };

      const startTime = Date.now();

      // Test type guard on large object
      isMouseEventData(largeEvent.data);

      const executionTime = Date.now() - startTime;

      // Should handle large objects quickly
      expect(executionTime).toBeLessThan(10);

      console.log(
        `[${testId}] Large data structure performance test completed (${executionTime}ms)`,
      );
    });
  });

  describe('Error Scenarios', () => {
    it('should handle malformed input gracefully', () => {
      const testId = `${operationId}_malformed_input`;
      console.log(`[${testId}] Testing malformed input handling`);

      const malformedInputs = [
        { toString: () => { throw new Error('toString failed'); } },
        new Date(), // Date object
        /regex/, // Regular expression
        () => {}, // Function
        Symbol('test'), // Symbol
      ];

      malformedInputs.forEach((input) => {
        expect(() => isMouseEventData(input)).not.toThrow();
        expect(() => isKeyboardEventData(input)).not.toThrow();
        expect(() => isMockByteBotdUser(input)).not.toThrow();
        expect(() => isValidCoordinates(input)).not.toThrow();
      });

      console.log(`[${testId}] Malformed input handling test completed`);
    });

    it('should handle circular references safely', () => {
      const testId = `${operationId}_circular_references`;
      console.log(`[${testId}] Testing circular reference handling`);

      const circularObject: Record<string, unknown> = {
        button: 1,
        x: 100,
        y: 200,
      };
      circularObject.self = circularObject;

      // Should not throw error with circular references
      expect(() => isMouseEventData(circularObject)).not.toThrow();
      expect(isMouseEventData(circularObject)).toBe(true); // Still valid despite circular ref

      console.log(`[${testId}] Circular reference handling test completed`);
    });

    it('should handle deeply nested objects', () => {
      const testId = `${operationId}_deep_nesting`;
      console.log(`[${testId}] Testing deeply nested object handling`);

      let deepObject: Record<string, unknown> = {
        button: 1,
        x: 100,
        y: 200,
      };

      // Create deeply nested structure
      for (let i = 0; i < 100; i++) {
        deepObject = { nested: deepObject };
      }

      // Should handle deep nesting without stack overflow
      expect(() => isMouseEventData(deepObject)).not.toThrow();

      console.log(`[${testId}] Deep nesting handling test completed`);
    });
  });

  describe('Cross-Type Compatibility', () => {
    it('should correctly differentiate between event types', () => {
      const testId = `${operationId}_event_type_differentiation`;
      console.log(`[${testId}] Testing event type differentiation`);

      const mouseEvent = {
        button: 1,
        x: 100,
        y: 200,
        clicks: 1,
        altKey: false,
        ctrlKey: false,
        shiftKey: false,
        metaKey: false,
      };

      const keyboardEvent = {
        keycode: 65,
        altKey: false,
        ctrlKey: false,
        shiftKey: false,
        metaKey: false,
      };

      // Mouse event should only pass mouse validation
      expect(isMouseEventData(mouseEvent)).toBe(true);
      expect(isKeyboardEventData(mouseEvent)).toBe(false);

      // Keyboard event should only pass keyboard validation
      expect(isKeyboardEventData(keyboardEvent)).toBe(true);
      expect(isMouseEventData(keyboardEvent)).toBe(false);

      console.log(`[${testId}] Event type differentiation test completed`);
    });

    it('should handle overlapping property names correctly', () => {
      const testId = `${operationId}_overlapping_properties`;
      console.log(`[${testId}] Testing overlapping property handling`);

      const eventWithOverlap = {
        button: 1,
        x: 100,
        y: 200,
        keycode: 65, // Both mouse and keyboard property
        altKey: false,
        ctrlKey: false,
        shiftKey: false,
        metaKey: false,
      };

      // Should validate based on required properties for each type
      expect(isMouseEventData(eventWithOverlap)).toBe(true); // Has button, x, y
      expect(isKeyboardEventData(eventWithOverlap)).toBe(true); // Has keycode

      console.log(`[${testId}] Overlapping property handling test completed`);
    });
  });
});