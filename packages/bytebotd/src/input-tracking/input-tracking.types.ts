/**
 * Input Tracking Type Definitions
 *
 * Comprehensive TypeScript interfaces for input tracking service
 * to resolve ESLint violations and provide precise typing.
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { UserRole, Permission } from '@bytebot/shared';

// Base coordinate interface for mouse positions
export interface Coordinates {
  x: number;
  y: number;
}

// Hold keys interface for modifier keys
export type HoldKey = 'alt' | 'ctrl' | 'shift' | 'meta';

// Button types for mouse interactions
export type Button = 'left' | 'right' | 'middle';

// Scroll direction types
export type ScrollDirection = 'up' | 'down' | 'left' | 'right';

// Key information interface
export interface KeyInfo {
  name: string;
  isPrintable: boolean;
  string?: string;
  shiftString?: string;
}

// Mock user interface for testing
export interface MockByteBotdUser {
  id: string;
  sub: string;
  username: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  isActive: boolean;
}

// Mouse event interfaces
export interface MouseEventData {
  button: number;
  x: number;
  y: number;
  clicks: number;
  altKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}

export interface KeyboardEventData {
  keycode: number;
  altKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}

export interface WheelEventData {
  x: number;
  y: number;
  direction: number;
  rotation: number;
}

// Request interfaces for HTTP endpoints
export interface TrackingStartRequest {
  sessionId?: string;
  userId?: string;
  options?: TrackingOptions;
}

export interface TrackingStopRequest {
  sessionId?: string;
  userId?: string;
  forceStop?: boolean;
}

export interface TrackingOptions {
  includeScreenshots?: boolean;
  debounceMs?: number;
  enableKeyLogging?: boolean;
  enableMouseTracking?: boolean;
}

// Response interfaces for HTTP endpoints
export interface TrackingResponse {
  success: boolean;
  message: string;
  data?: TrackingData;
  error?: string;
  timestamp: string;
}

export interface TrackingData {
  isTracking: boolean;
  sessionId?: string;
  userId?: string;
  startTime?: string;
  options?: TrackingOptions;
}

// Service mock interfaces for testing
export interface MockInputTrackingService {
  startTracking: jest.Mock;
  stopTracking: jest.Mock;
  isTracking: jest.Mock;
}

export interface MockLogger {
  log: jest.Mock;
  error: jest.Mock;
  warn: jest.Mock;
  debug: jest.Mock;
  verbose: jest.Mock;
}

export interface MockJwtAuthGuard {
  canActivate: jest.Mock;
}

export interface MockRolesGuard {
  canActivate: jest.Mock;
}

// Test execution context interfaces
export interface MockExecutionContext {
  switchToHttp: () => MockHttpContext;
  getHandler: () => unknown;
  getClass: () => unknown;
}

export interface MockHttpContext {
  getRequest: () => MockRequest;
  getResponse: () => MockResponse;
}

export interface MockRequest {
  user?: MockByteBotdUser;
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string>;
  query?: Record<string, string>;
}

export interface MockResponse {
  status: jest.Mock;
  json: jest.Mock;
  send: jest.Mock;
}

// Screenshot interface
export interface ScreenshotData {
  image: string;
  timestamp?: string;
  coordinates?: Coordinates;
}

// Input validation interfaces
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface InputValidationOptions {
  requireUser?: boolean;
  allowAnonymous?: boolean;
  validatePermissions?: boolean;
  strictMode?: boolean;
}

// Event tracking interfaces
export interface TrackedEvent {
  id: string;
  type: 'mouse' | 'keyboard' | 'scroll';
  timestamp: string;
  data: MouseEventData | KeyboardEventData | WheelEventData;
  userId?: string;
  sessionId?: string;
}

export interface EventBuffer {
  events: TrackedEvent[];
  maxSize: number;
  currentSize: number;
  lastFlush: string;
}

// Error handling interfaces
export interface InputTrackingError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
  userId?: string;
  sessionId?: string;
}

export interface ErrorContext {
  operation: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

// Type guards for runtime type checking
export function isMouseEventData(data: unknown): data is MouseEventData {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as MouseEventData).button === 'number' &&
    typeof (data as MouseEventData).x === 'number' &&
    typeof (data as MouseEventData).y === 'number'
  );
}

export function isKeyboardEventData(data: unknown): data is KeyboardEventData {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as KeyboardEventData).keycode === 'number'
  );
}

export function isMockByteBotdUser(user: unknown): user is MockByteBotdUser {
  return (
    typeof user === 'object' &&
    user !== null &&
    typeof (user as MockByteBotdUser).id === 'string' &&
    typeof (user as MockByteBotdUser).username === 'string' &&
    typeof (user as MockByteBotdUser).role === 'string'
  );
}

export function isValidCoordinates(coords: unknown): coords is Coordinates {
  return (
    typeof coords === 'object' &&
    coords !== null &&
    typeof (coords as Coordinates).x === 'number' &&
    typeof (coords as Coordinates).y === 'number'
  );
}

// Utility types for better type safety
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;
