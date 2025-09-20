/**
 * TypeScript Mock Type Utilities
 *
 * Provides comprehensive type-safe mock interfaces for Jest testing,
 * resolving TS2339 "Property does not exist" errors across test files.
 *
 * @version 1.0.0
 * @author Advanced TS Property Resolution Agent
 */

/**
 * Jest Mock Function with proper typing
 * Extends basic function type with Jest mock methods
 */
export type MockFunction<T extends (...args: any[]) => any> = jest.MockedFunction<T>;

/**
 * Jest Mock Object with proper typing
 * Provides complete mock interface for service objects
 */
export type MockObject<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? MockFunction<T[K]>
    : T[K] extends object
    ? MockObject<T[K]>
    : T[K];
};

/**
 * NUT.js Component Mock Interfaces
 * Type-safe mocks for @nut-tree-fork/nut-js components
 */

// Mouse component mock interface
export interface MockMouseInterface {
  move: MockFunction<(path: any, movementType?: any) => Promise<any>>;
  setPosition: MockFunction<(coordinates: any) => Promise<any>>;
  getPosition: MockFunction<() => Promise<{ x: number; y: number }>>;
  leftClick: MockFunction<() => Promise<any>>;
  rightClick: MockFunction<() => Promise<any>>;
  doubleClick: MockFunction<() => Promise<any>>;
  drag: MockFunction<(from: any, to: any) => Promise<any>>;
  scrollDown: MockFunction<(amount?: number) => Promise<any>>;
  scrollUp: MockFunction<(amount?: number) => Promise<any>>;
  pressButton: MockFunction<(button: any) => Promise<any>>;
  releaseButton: MockFunction<(button: any) => Promise<any>>;
  config: {
    mouseSpeed: number;
    autoDelayMs: number;
  };
}

// Screen component mock interface
export interface MockScreenInterface {
  capture: MockFunction<(region?: any) => Promise<any>>;
  find: MockFunction<(needle: any, options?: any) => Promise<any>>;
  waitFor: MockFunction<(needle: any, timeout?: number, region?: any) => Promise<any>>;
  highlight: MockFunction<(region: any, duration?: number, color?: string) => Promise<void>>;
  config: {
    resourceDirectory: string;
    confidence: number;
  };
}

// Keyboard component mock interface
export interface MockKeyboardInterface {
  type: MockFunction<(text: string) => Promise<any>>;
  pressKey: MockFunction<(key: any, ...modifiers: any[]) => Promise<any>>;
  releaseKey: MockFunction<(key: any, ...modifiers: any[]) => Promise<any>>;
  config: {
    autoDelayMs: number;
  };
}

// Complete NUT.js mock interface
export interface MockNutInterface {
  screen: MockScreenInterface;
  mouse: MockMouseInterface;
  keyboard: MockKeyboardInterface;
  Key: Record<string, string>;
  Button: Record<string, number>;
  Point: MockFunction<(x: number, y: number) => { x: number; y: number }>;
  Region: MockFunction<(x: number, y: number, width: number, height: number) => any>;
  Image: MockFunction<() => any>;
  sleep: MockFunction<(ms: number) => Promise<void>>;
  straightTo: MockFunction<(target: any) => any>;
  linear: MockFunction<(target: any) => any>;
  PROVIDER: Record<string, string>;
}

/**
 * Service Mock Interfaces
 * Type-safe mocks for application services
 */

// Computer Use Service mock interface
export interface MockComputerUseServiceInterface {
  executeAction: MockFunction<(action: any) => Promise<any>>;
  generateTestId: MockFunction<() => string>;
  executeJob: MockFunction<(job: any) => Promise<any>>;
  [key: string]: any; // Allow additional properties
}

// NUT Service mock interface
export interface MockNutServiceInterface {
  moveMouse: MockFunction<(coordinates: any) => Promise<any>>;
  clickMouse: MockFunction<(coordinates: any, button?: any) => Promise<any>>;
  captureScreen: MockFunction<(region?: any) => Promise<any>>;
  typeText: MockFunction<(text: string) => Promise<any>>;
  pressKey: MockFunction<(key: any) => Promise<any>>;
  [key: string]: any; // Allow additional properties
}

/**
 * Generic Service Response Interface
 */
export interface ServiceResponse {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Mock Factory Functions
 * Utility functions to create properly typed mocks
 */

/**
 * Creates a properly typed Jest mock function
 */
export function createMockFunction<T extends (...args: any[]) => any>(): MockFunction<T> {
  return jest.fn() as unknown as MockFunction<T>;
}

/**
 * Creates a properly typed service mock
 */
export function createServiceMock<T>(): MockObject<T> {
  return {} as MockObject<T>;
}

/**
 * Creates a complete NUT.js mock with proper typing
 */
export function createNutMock(): MockNutInterface {
  return {
    screen: {
      capture: createMockFunction(),
      find: createMockFunction(),
      waitFor: createMockFunction(),
      highlight: createMockFunction(),
      config: {
        resourceDirectory: '/tmp/nut-resources',confidence: 0.99,},
    },
    mouse: {
      move: createMockFunction(),
      setPosition: createMockFunction(),
      getPosition: createMockFunction(),
      leftClick: createMockFunction(),
      rightClick: createMockFunction(),
      doubleClick: createMockFunction(),
      drag: createMockFunction(),
      scrollDown: createMockFunction(),
      scrollUp: createMockFunction(),
      pressButton: createMockFunction(),
      releaseButton: createMockFunction(),
      config: {
        mouseSpeed: 1000,
        autoDelayMs: 100,
      },
    },
    keyboard: {
      type: createMockFunction(),
      pressKey: createMockFunction(),
      releaseKey: createMockFunction(),
      config: {
        autoDelayMs: 100,
      },
    },
    Key: {
      Escape: 'Escape',Enter: 'Return',Space: 'space',Tab: 'Tab',Shift: 'shift',Control: 'ctrl',Alt: 'alt',Meta: 'cmd',F1: 'F1',F12: 'F12',Up: 'up',Down: 'down',Left: 'left',Right: 'right',},Button: {
      LEFT: 0,
      MIDDLE: 1,
      RIGHT: 2,
    },
    Point: createMockFunction(),
    Region: createMockFunction(),
    Image: createMockFunction(),
    sleep: createMockFunction(),
    straightTo: createMockFunction(),
    linear: createMockFunction(),
    PROVIDER: {
      CV: 'opencv',TEMPLATE_MATCHING: 'template',},};
}

/**
 * Authentication and Enterprise Service Mock Types
 */
export interface MockAuthServiceInterface {
  authToken: string;
  clientId: string;
  tenantId: string;
  validateToken: MockFunction<(token: string) => Promise<boolean>>;
  refreshToken: MockFunction<() => Promise<string>>;
  [key: string]: any;
}

export interface MockEnterpriseServiceInterface {
  executeAction: MockFunction<(action: any) => Promise<ServiceResponse>>;
  generateTestId: MockFunction<() => string>;
  metadata: Record<string, any>;
  [key: string]: any;
}

/**
 * Performance and Testing Mock Types
 */
export interface MockPerformanceMetrics {
  duration: number;
  successfulRequests: number;
  size: number;
  amount: number;
  [key: string]: any;
}

export interface MockTestingInterface {
  generateTestId: MockFunction<() => string>;
  mockImplementation: MockFunction<(implementation: any) => void>;
  text: string;
  [key: string]: any;
}

/**
 * Type-safe client assertion utility
 * Ensures proper typing after undefined checks in tests
 */
export function assertClientDefined<T>(client: T | undefined): asserts client is T {
  if (!client) {
    throw new Error('Client is undefined');
  }
}

/**
 * Safe client access with proper typing
 * Use this instead of (client ?? "default") patterns
 */
export function getClientSafely<T>(client: T | undefined): T {
  if (!client) {
    throw new Error('Client is undefined - test setup may be incorrect');
  }
  return client;
}