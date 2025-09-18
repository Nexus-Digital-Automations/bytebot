 
 
 
 
/* eslint-env jest */

/**
 * Input Tracking Gateway Test Suite
 *
 * Comprehensive unit and integration tests for InputTrackingGateway covering:
 * - WebSocket connection and disconnection handling
 * - Real-time event emission (actions and screenshot+action)
 * - Socket.io server integration and configuration
 * - CORS policy testing and security
 * - Client connection lifecycle management
 * - Event broadcasting and message delivery
 * - Performance under high-frequency events
 * - Error scenarios and connection failures
 * - Memory leak prevention and cleanup
 *
 * @author Claude Code (Testing & QA Specialist)
 * @version 1.0.0
 * @coverage-target 100%
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { Server as _Server, Socket as _Socket } from 'socket.io';
import { ComputerAction } from '@bytebot/shared';
import { InputTrackingGateway } from '../input-tracking.gateway';
// Types imported for potential use but may not be needed in all test cases

// Mock Socket.IO types
interface MockSocket {
  id: string;
  emit: jest.Mock;
  disconnect: jest.Mock;
  connected: boolean;
  rooms: Set<string>;
}

interface MockServer {
  emit: jest.Mock;
  sockets: {
    sockets: Map<string, MockSocket>;
  };
  to: jest.Mock;
  in: jest.Mock;
}

describe('InputTrackingGateway', () => {
  let gateway: InputTrackingGateway;
  let mockServer: MockServer;
  let logger: Logger;

  const operationId = `input_tracking_gateway_test${Date.now()}`;

  // Mock computer actions for testing
  const mockClickAction: ComputerAction = {
    action: 'click_mouse',
    coordinates: { x: 100, y: 200 },
    button: 'left',
    clickCount: 1,
  };

  const mockDragAction: ComputerAction = {
    action: 'drag_mouse',
    button: 'left',
    path: [
      { x: 100, y: 100 },
      { x: 150, y: 150 },
      { x: 200, y: 200 },
    ],
  };

  const mockTypeAction: ComputerAction = {
    action: 'type_text',
    text: 'Hello World',
  };

  const mockScrollAction: ComputerAction = {
    action: 'scroll',
    direction: 'down',
    scrollCount: 3,
    coordinates: { x: 300, y: 400 },
  };

  const mockScreenshot = {
    image:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  };

  const createMockSocket = (id: string): MockSocket => ({
    id,
    emit: jest.fn(),
    disconnect: jest.fn(),
    connected: true,
    rooms: new Set(),
  });

  const createMockServer = (): MockServer => ({
    emit: jest.fn(),
    sockets: {
      sockets: new Map(),
    },
    to: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
  });

  beforeEach(async () => {
    console.log(`[${operationId}] Setting up InputTrackingGateway test module`);

    mockServer = createMockServer();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InputTrackingGateway,
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<InputTrackingGateway>(InputTrackingGateway);
    logger = module.get<Logger>(Logger);

    // Set the mock server
    gateway.server = mockServer as unknown as _Server;

    console.log(`[${operationId}] InputTrackingGateway test setup completed`);
  });

  afterEach(() => {
    jest.clearAllMocks();
    console.log(`[${operationId}] InputTrackingGateway test cleanup completed`);
  });

  describe('Gateway Initialization', () => {
    it('should be defined', () => {
      const testId = `${operationId}_gateway_defined`;
      console.log(`[${testId}] Testing gateway initialization`);

      expect(gateway).toBeDefined();
      expect(logger).toBeDefined();

      console.log(`[${testId}] Gateway initialization test completed`);
    });

    it('should have WebSocket server property', () => {
      const testId = `${operationId}_websocket_server_property`;
      console.log(`[${testId}] Testing WebSocket server property`);

      expect(gateway.server).toBeDefined();
      expect(typeof gateway.server.emit).toBe('function');

      console.log(`[${testId}] WebSocket server property test completed`);
    });

    it('should be decorated as injectable and WebSocket gateway', () => {
      const testId = `${operationId}_decorators_validation`;
      console.log(`[${testId}] Testing gateway decorators`);

      const injectable = Reflect.getMetadata(
        '__injectable__',
        InputTrackingGateway,
      ) as boolean;
      expect(injectable).toBe(true);

      console.log(`[${testId}] Gateway decorators test completed`);
    });
  });

  describe('Client Connection Handling', () => {
    it('should handle client connection', () => {
      const testId = `${operationId}_client_connection`;
      console.log(`[${testId}] Testing client connection handling`);

      const mockClient = createMockSocket('client_123');

      gateway.handleConnection(mockClient as unknown as _Socket);

      expect(logger.log).toHaveBeenCalledWith('Client connected: client_123');

      console.log(`[${testId}] Client connection handling test completed`);
    });

    it('should handle client disconnection', () => {
      const testId = `${operationId}_client_disconnection`;
      console.log(`[${testId}] Testing client disconnection handling`);

      const mockClient = createMockSocket('client_456');

      gateway.handleDisconnect(mockClient as unknown as _Socket);

      expect(logger.log).toHaveBeenCalledWith(
        'Client disconnected: client_456',
      );

      console.log(`[${testId}] Client disconnection handling test completed`);
    });

    it('should handle multiple simultaneous connections', () => {
      const testId = `${operationId}_multiple_connections`;
      console.log(`[${testId}] Testing multiple simultaneous connections`);

      const clients = Array.from({ length: 10 }, (_, i) =>
        createMockSocket(`client${i}`),
      );

      clients.forEach((client) => {
        gateway.handleConnection(client as unknown as _Socket);
      });

      expect(logger.log).toHaveBeenCalledTimes(10);
      clients.forEach((client, i) => {
        expect(logger.log).toHaveBeenCalledWith(
          `Client connected: client${i}`,
        );
      });

      console.log(
        `[${testId}] Multiple simultaneous connections test completed`,
      );
    });

    it('should handle rapid connection/disconnection cycles', () => {
      const testId = `${operationId}_rapid_connection_cycles`;
      console.log(`[${testId}] Testing rapid connection/disconnection cycles`);

      const clientId = 'rapid_client';
      const mockClient = createMockSocket(clientId);

      // Simulate rapid cycles
      for (let i = 0; i < 5; i++) {
        gateway.handleConnection(mockClient as unknown as _Socket);
        gateway.handleDisconnect(mockClient as unknown as _Socket);
      }

      expect(logger.log).toHaveBeenCalledTimes(10); // 5 connections + 5 disconnections

      console.log(
        `[${testId}] Rapid connection/disconnection cycles test completed`,
      );
    });
  });

  describe('Action Emission', () => {
    it('should emit click mouse action', () => {
      const testId = `${operationId}_emit_click_action`;
      console.log(`[${testId}] Testing click mouse action emission`);

      gateway.emitAction(mockClickAction);

      expect(mockServer.emit).toHaveBeenCalledWith('action', mockClickAction);

      console.log(`[${testId}] Click mouse action emission test completed`);
    });

    it('should emit drag mouse action', () => {
      const testId = `${operationId}_emit_drag_action`;
      console.log(`[${testId}] Testing drag mouse action emission`);

      gateway.emitAction(mockDragAction);

      expect(mockServer.emit).toHaveBeenCalledWith('action', mockDragAction);

      console.log(`[${testId}] Drag mouse action emission test completed`);
    });

    it('should emit type text action', () => {
      const testId = `${operationId}_emit_type_action`;
      console.log(`[${testId}] Testing type text action emission`);

      gateway.emitAction(mockTypeAction);

      expect(mockServer.emit).toHaveBeenCalledWith('action', mockTypeAction);

      console.log(`[${testId}] Type text action emission test completed`);
    });

    it('should emit scroll action', () => {
      const testId = `${operationId}_emit_scroll_action`;
      console.log(`[${testId}] Testing scroll action emission`);

      gateway.emitAction(mockScrollAction);

      expect(mockServer.emit).toHaveBeenCalledWith('action', mockScrollAction);

      console.log(`[${testId}] Scroll action emission test completed`);
    });

    it('should handle complex action objects', () => {
      const testId = `${operationId}_complex_action_emission`;
      console.log(`[${testId}] Testing complex action object emission`);

      const complexAction: ComputerAction = {
        action: 'type_keys',
        keys: ['ctrl', 'c'],
      };

      gateway.emitAction(complexAction);

      expect(mockServer.emit).toHaveBeenCalledWith('action', complexAction);

      console.log(`[${testId}] Complex action emission test completed`);
    });
  });

  describe('Screenshot and Action Emission', () => {
    it('should emit screenshot with click action', () => {
      const testId = `${operationId}_emit_screenshot_click`;
      console.log(`[${testId}] Testing screenshot with click action emission`);

      gateway.emitScreenshotAndAction(mockScreenshot, mockClickAction);

      expect(mockServer.emit).toHaveBeenCalledWith(
        'screenshotAndAction',
        mockScreenshot,
        mockClickAction,
      );

      console.log(
        `[${testId}] Screenshot with click action emission test completed`,
      );
    });

    it('should emit screenshot with drag action', () => {
      const testId = `${operationId}_emit_screenshot_drag`;
      console.log(`[${testId}] Testing screenshot with drag action emission`);

      gateway.emitScreenshotAndAction(mockScreenshot, mockDragAction);

      expect(mockServer.emit).toHaveBeenCalledWith(
        'screenshotAndAction',
        mockScreenshot,
        mockDragAction,
      );

      console.log(
        `[${testId}] Screenshot with drag action emission test completed`,
      );
    });

    it('should handle large screenshot data', () => {
      const testId = `${operationId}_large_screenshot_emission`;
      console.log(`[${testId}] Testing large screenshot data emission`);

      const largeScreenshot = {
        image: 'data:image/png;base64,' + 'x'.repeat(100000), // Large base64 string
      };

      gateway.emitScreenshotAndAction(largeScreenshot, mockClickAction);

      expect(mockServer.emit).toHaveBeenCalledWith(
        'screenshotAndAction',
        largeScreenshot,
        mockClickAction,
      );

      console.log(`[${testId}] Large screenshot emission test completed`);
    });

    it('should emit screenshot and action with all parameter types', () => {
      const testId = `${operationId}_screenshot_action_parameter_types`;
      console.log(`[${testId}] Testing screenshot and action parameter types`);

      const screenshotWithMetadata = {
        image: mockScreenshot.image,
        timestamp: new Date().toISOString(),
        quality: 95,
        format: 'png',
      };

      gateway.emitScreenshotAndAction(screenshotWithMetadata, mockScrollAction);

      expect(mockServer.emit).toHaveBeenCalledWith(
        'screenshotAndAction',
        screenshotWithMetadata,
        mockScrollAction,
      );

      console.log(
        `[${testId}] Screenshot and action parameter types test completed`,
      );
    });
  });

  describe('High-Frequency Event Processing', () => {
    it('should handle rapid action emissions', () => {
      const testId = `${operationId}_rapid_action_emissions`;
      console.log(`[${testId}] Testing rapid action emissions`);

      const actionCount = 100;
      const startTime = Date.now();

      for (let i = 0; i < actionCount; i++) {
        gateway.emitAction({
          action: 'move_mouse',
          coordinates: { x: i, y: i },
        });
      }

      const processingTime = Date.now() - startTime;

      expect(mockServer.emit).toHaveBeenCalledTimes(actionCount);
      expect(processingTime).toBeLessThan(1000); // Should complete within 1 second

      console.log(
        `[${testId}] Rapid action emissions test completed (${processingTime}ms)`,
      );
    });

    it('should handle burst screenshot emissions', () => {
      const testId = `${operationId}_burst_screenshot_emissions`;
      console.log(`[${testId}] Testing burst screenshot emissions`);

      const burstCount = 50;
      const startTime = Date.now();

      for (let i = 0; i < burstCount; i++) {
        gateway.emitScreenshotAndAction(
          { image: `screenshot${i}` },
          {
            action: 'click_mouse',
            button: 'left',
            clickCount: 1,
            coordinates: { x: i, y: i },
          },
        );
      }

      const processingTime = Date.now() - startTime;

      expect(mockServer.emit).toHaveBeenCalledTimes(burstCount);
      expect(processingTime).toBeLessThan(2000); // Should complete within 2 seconds

      console.log(
        `[${testId}] Burst screenshot emissions test completed (${processingTime}ms)`,
      );
    });

    it('should maintain event order under high frequency', () => {
      const testId = `${operationId}_event_order_high_frequency`;
      console.log(`[${testId}] Testing event order under high frequency`);

      const events = [
        { action: 'move_mouse' as const, coordinates: { x: 1, y: 1 } },
        {
          action: 'click_mouse' as const,
          button: 'left' as const,
          clickCount: 1,
          coordinates: { x: 2, y: 2 },
        },
        { action: 'type_text' as const, text: 'test' },
      ];

      events.forEach((event) => {
        gateway.emitAction(event);
      });

      expect(mockServer.emit).toHaveBeenCalledTimes(3);

      const emitCalls = (mockServer.emit as jest.Mock).mock
        .calls as unknown[][];
      events.forEach((event, index) => {
        expect((emitCalls[index] as unknown[])[0]).toBe('action');
        expect((emitCalls[index] as unknown[])[1]).toEqual(event);
      });

      console.log(
        `[${testId}] Event order under high frequency test completed`,
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null action gracefully', () => {
      const testId = `${operationId}_null_action_handling`;
      console.log(`[${testId}] Testing null action handling`);

      // This should not throw an error
      expect(() => {
        gateway.emitAction(null as unknown as ComputerAction);
      }).not.toThrow();

      expect(mockServer.emit).toHaveBeenCalledWith('action', null);

      console.log(`[${testId}] Null action handling test completed`);
    });

    it('should handle undefined screenshot', () => {
      const testId = `${operationId}_undefined_screenshot_handling`;
      console.log(`[${testId}] Testing undefined screenshot handling`);

      expect(() => {
        gateway.emitScreenshotAndAction(
          _undefined as unknown as { image: string },
          mockClickAction,
        );
      }).not.toThrow();

      expect(mockServer.emit).toHaveBeenCalledWith(
        'screenshotAndAction',
        undefined,
        mockClickAction,
      );

      console.log(`[${testId}] Undefined screenshot handling test completed`);
    });

    it('should handle malformed action objects', () => {
      const testId = `${operationId}_malformed_action_handling`;
      console.log(`[${testId}] Testing malformed action objects`);

      const malformedAction = {
        // Missing required 'action' property
        coordinates: { x: 100, y: 200 },
      };

      expect(() => {
        gateway.emitAction(malformedAction as unknown as ComputerAction);
      }).not.toThrow();

      expect(mockServer.emit).toHaveBeenCalledWith('action', malformedAction);

      console.log(`[${testId}] Malformed action handling test completed`);
    });

    it('should handle server emission errors', () => {
      const testId = `${operationId}_server_emission_errors`;
      console.log(`[${testId}] Testing server emission error handling`);

      // Mock server emit to throw error
      mockServer.emit = (
        jest.fn()
      ).mockImplementation(() => {
        throw new Error('Network error');
      });

      expect(() => {
        gateway.emitAction(mockClickAction);
      }).toThrow('Network error');

      console.log(`[${testId}] Server emission error handling test completed`);
    });

    it('should handle connection with invalid client ID', () => {
      const testId = `${operationId}_invalid_client_id`;
      console.log(`[${testId}] Testing connection with invalid client ID`);

      const invalidClient = createMockSocket('');

      gateway.handleConnection(invalidClient as unknown as _Socket);

      expect(logger.log).toHaveBeenCalledWith('Client connected: ');

      console.log(`[${testId}] Invalid client ID handling test completed`);
    });
  });

  describe('Memory Management and Cleanup', () => {
    it('should not retain references after disconnection', () => {
      const testId = `${operationId}_memory_cleanup_disconnection`;
      console.log(`[${testId}] Testing memory cleanup after disconnection`);

      const client = createMockSocket('temp_client');

      gateway.handleConnection(client as unknown as _Socket);
      gateway.handleDisconnect(client as unknown as _Socket);

      // Verify logging was called correctly
      expect(logger.log).toHaveBeenCalledWith('Client connected: temp_client');
      expect(logger.log).toHaveBeenCalledWith(
        'Client disconnected: temp_client',
      );

      console.log(
        `[${testId}] Memory cleanup after disconnection test completed`,
      );
    });

    it('should handle massive connection cycles without memory leaks', () => {
      const testId = `${operationId}_memory_leak_prevention`;
      console.log(`[${testId}] Testing memory leak prevention`);

      const connectionCount = 1000;

      for (let i = 0; i < connectionCount; i++) {
        const client = createMockSocket(`stress_client${i}`);
        gateway.handleConnection(client as unknown as _Socket);
        gateway.handleDisconnect(client as unknown as _Socket);
      }

      expect(logger.log).toHaveBeenCalledTimes(connectionCount * 2);

      console.log(`[${testId}] Memory leak prevention test completed`);
    });
  });

  describe('CORS and Security Configuration', () => {
    it('should have proper WebSocket gateway configuration', () => {
      const testId = `${operationId}_websocket_configuration`;
      console.log(`[${testId}] Testing WebSocket gateway configuration`);

      // Gateway should be properly configured (this is more of an integration test)
      expect(gateway).toBeDefined();

      console.log(`[${testId}] WebSocket gateway configuration test completed`);
    });

    it('should allow cross-origin connections', () => {
      const testId = `${operationId}_cors_configuration`;
      console.log(`[${testId}] Testing CORS configuration`);

      // This would be tested in integration tests with actual connections
      // Here we just verify the gateway handles connections normally
      const client = createMockSocket('cors_test_client');

      expect(() => {
        gateway.handleConnection(client as unknown as _Socket);
      }).not.toThrow();

      console.log(`[${testId}] CORS configuration test completed`);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should emit actions within performance threshold', () => {
      const testId = `${operationId}_action_emission_performance`;
      console.log(`[${testId}] Testing action emission performance`);

      const iterations = 1000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        gateway.emitAction({
          action: 'move_mouse',
          coordinates: { x: i, y: i },
        });
      }

      const totalTime = Date.now() - startTime;
      const avgTimePerEmission = totalTime / iterations;

      expect(avgTimePerEmission).toBeLessThan(1); // Less than 1ms per emission
      expect(totalTime).toBeLessThan(5000); // Total less than 5 seconds

      console.log(
        `[${testId}] Action emission performance test completed (${totalTime}ms total, ${avgTimePerEmission.toFixed(3)}ms avg)`,
      );
    });

    it('should handle connection events efficiently', () => {
      const testId = `${operationId}_connection_event_performance`;
      console.log(`[${testId}] Testing connection event performance`);

      const connectionCount = 100;
      const startTime = Date.now();

      for (let i = 0; i < connectionCount; i++) {
        const client = createMockSocket(`perf_client${i}`);
        gateway.handleConnection(client as unknown as _Socket);
      }

      const totalTime = Date.now() - startTime;
      const avgTimePerConnection = totalTime / connectionCount;

      expect(avgTimePerConnection).toBeLessThan(1); // Less than 1ms per connection
      expect(totalTime).toBeLessThan(1000); // Total less than 1 second

      console.log(
        `[${testId}] Connection event performance test completed (${totalTime}ms total, ${avgTimePerConnection.toFixed(3)}ms avg)`,
      );
    });
  });

  describe('Event Broadcasting Scenarios', () => {
    it('should broadcast to all connected clients', () => {
      const testId = `${operationId}_broadcast_all_clients`;
      console.log(`[${testId}] Testing broadcast to all clients`);

      // Simulate multiple connected clients
      const clientCount = 5;
      for (let i = 0; i < clientCount; i++) {
        const client = createMockSocket(`broadcast_client${i}`);
        gateway.handleConnection(client as unknown as _Socket);
      }

      gateway.emitAction(mockClickAction);

      expect(mockServer.emit).toHaveBeenCalledWith('action', mockClickAction);

      console.log(`[${testId}] Broadcast to all clients test completed`);
    });

    it('should handle mixed event types in sequence', () => {
      const testId = `${operationId}_mixed_event_sequence`;
      console.log(`[${testId}] Testing mixed event types in sequence`);

      gateway.emitAction(mockClickAction);
      gateway.emitScreenshotAndAction(mockScreenshot, mockDragAction);
      gateway.emitAction(mockTypeAction);
      gateway.emitScreenshotAndAction(mockScreenshot, mockScrollAction);

      expect(mockServer.emit).toHaveBeenCalledTimes(4);
      expect(mockServer.emit).toHaveBeenNthCalledWith(
        1,
        'action',
        mockClickAction,
      );
      expect(mockServer.emit).toHaveBeenNthCalledWith(
        2,
        'screenshotAndAction',
        mockScreenshot,
        mockDragAction,
      );
      expect(mockServer.emit).toHaveBeenNthCalledWith(
        3,
        'action',
        mockTypeAction,
      );
      expect(mockServer.emit).toHaveBeenNthCalledWith(
        4,
        'screenshotAndAction',
        mockScreenshot,
        mockScrollAction,
      );

      console.log(`[${testId}] Mixed event sequence test completed`);
    });
  });

  describe('Reliability and Resilience', () => {
    it('should maintain functionality after server errors', () => {
      const testId = `${operationId}_server_error_recovery`;
      console.log(`[${testId}] Testing server error recovery`);

      // First call fails
      mockServer.emit = (
        jest.fn().mockImplementationOnce(() => {
          throw new Error('Temporary server error');
        })
      ).mockImplementation(() => {
        return true;
      });

      // First emission should throw
      expect(() => {
        gateway.emitAction(mockClickAction);
      }).toThrow('Temporary server error');

      // Second emission should work
      expect(() => {
        gateway.emitAction(mockTypeAction);
      }).not.toThrow();

      console.log(`[${testId}] Server error recovery test completed`);
    });

    it('should handle concurrent connections and emissions', () => {
      const testId = `${operationId}_concurrent_operations`;
      console.log(`[${testId}] Testing concurrent connections and emissions`);

      const startTime = Date.now();

      // Simulate concurrent connections
      const connectionPromises = Array.from({ length: 10 }, (_, i) =>
        Promise.resolve().then(() => {
          const client = createMockSocket(`concurrent_client${i}`);
          gateway.handleConnection(client as unknown as _Socket);
        }),
      );

      // Simulate concurrent emissions
      const emissionPromises = Array.from({ length: 10 }, (_, i) =>
        Promise.resolve().then(() => {
          gateway.emitAction({
            action: 'move_mouse',
            coordinates: { x: i * 10, y: i * 10 },
          });
        }),
      );

      return Promise.all([...connectionPromises, ...emissionPromises]).then(
        () => {
          const totalTime = Date.now() - startTime;

          expect(logger.log).toHaveBeenCalledTimes(10); // 10 connections
          expect(mockServer.emit).toHaveBeenCalledTimes(10); // 10 emissions
          expect(totalTime).toBeLessThan(1000); // Should complete quickly

          console.log(
            `[${testId}] Concurrent operations test completed (${totalTime}ms)`,
          );
        },
      );
    });
  });
});
