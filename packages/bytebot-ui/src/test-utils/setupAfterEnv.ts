/**
 * Jest After Environment Setup - Bytebot-UI
 *
 * Custom Jest matchers and test utilities for Bytebot UI package:
 * - React component testing utilities
 * - UI interaction validation
 * - Socket.io client mocking
 * - Tailwind CSS class validation
 * - Accessibility testing helpers
 *
 * @author Claude Code (Based on Gold Standard Template)
 * @version 2.0.0
 */

import React from "react";
import { expect } from "@jest/globals";
import { type RenderResult, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import {
  ASYNC_OPERATION_TIMEOUT_MS,
  BYTES_PER_MB,
  DESKTOP_BREAKPOINT_PX,
  MEMORY_USAGE_THRESHOLD_MB,
  MOBILE_BREAKPOINT_PX,
  PERFORMANCE_RENDER_THRESHOLD_COMPLEX_MS,
  SESSION_EXPIRY_MS,
  TABLET_BREAKPOINT_PX,
  USER_INTERACTION_TIMEOUT_MS,
  PERFORMANCE_RENDER_THRESHOLD_MS as _PERFORMANCE_RENDER_THRESHOLD_MS,
  TEST_COMPONENT_PERFORMANCE_LIMIT_MS as _TEST_COMPONENT_PERFORMANCE_LIMIT_MS,
} from "@/constants/ui";

// Custom Jest matchers for Bytebot UI domain
expect.extend({
  /**
   * Validates that a React element has specific Tailwind classes
   */
  toHaveTailwindClass(
    received: HTMLElement,
    className: string,
  ): jest.CustomMatcherResult {
    if (received?.classList == null) {
      return {
        message: () => `Expected element to have classList property`,
        pass: false,
      };
    }

    const pass = received.classList.contains(className);

    if (pass) {
      return {
        message: () =>
          `Expected element not to have Tailwind class "${className}"`,
        pass: true,
      };
    }
    return {
      message: () =>
        `Expected element to have Tailwind class "${className}", but got classes: ${Array.from(received.classList).join(", ")}`,
      pass: false,
    };
  },

  /**
   * Validates Socket.io event structure
   */
  toBeValidSocketEvent(received: unknown): jest.CustomMatcherResult {
    if (typeof received !== "object" || received === null) {
      return {
        message: () => `Expected ${received} to be an object`,
        pass: false,
      };
    }

    const event = received as Record<string, unknown>;
    const hasEventType = "type" in event && typeof event.type === "string";
    const hasPayload = "payload" in event;
    const hasTimestamp = "timestamp" in event;

    const pass = hasEventType && hasPayload && hasTimestamp;

    if (pass) {
      return {
        message: () => `Expected event not to be a valid Socket.io event`,
        pass: true,
      };
    }
    return {
      message: () =>
        `Expected event to be a valid Socket.io event with type, payload, and timestamp`,
      pass: false,
    };
  },

  /**
   * Validates task UI representation
   */
  toBeValidTaskUI(received: unknown): jest.CustomMatcherResult {
    if (typeof received !== "object" || received === null) {
      return {
        message: () => `Expected ${received} to be an object`,
        pass: false,
      };
    }

    const task = received as Record<string, unknown>;
    const requiredFields = ["id", "title", "status", "createdAt"];
    const missingFields = requiredFields.filter((field) => !(field in task));

    if (missingFields.length === 0) {
      return {
        message: () =>
          `Expected task UI object not to have all required fields: ${requiredFields.join(", ")}`,
        pass: true,
      };
    }
    return {
      message: () =>
        `Expected task UI object to have all required fields: ${requiredFields.join(", ")}, missing: ${missingFields.join(", ")}`,
      pass: false,
    };
  },

  /**
   * Validates that an element is accessible
   */
  toBeAccessible(received: HTMLElement): jest.CustomMatcherResult {
    if (received == null) {
      return {
        message: () => `Expected element to exist`,
        pass: false,
      };
    }

    // Check for basic accessibility attributes
    const hasAriaLabel = received.hasAttribute("aria-label");
    const hasAriaLabelledBy = received.hasAttribute("aria-labelledby");
    const hasRole = received.hasAttribute("role");
    const hasTabIndex = received.hasAttribute("tabindex");

    // Element should have at least one accessibility attribute
    const hasAccessibilityAttrs =
      hasAriaLabel || hasAriaLabelledBy || hasRole || hasTabIndex;

    if (hasAccessibilityAttrs) {
      return {
        message: () => `Expected element not to have accessibility attributes`,
        pass: true,
      };
    }
    return {
      message: () =>
        `Expected element to have accessibility attributes (aria-label, aria-labelledby, role, or tabindex)`,
      pass: false,
    };
  },

  /**
   * Validates component render performance
   */
  toRenderWithinTime(
    received: () => unknown,
    maxMs = PERFORMANCE_RENDER_THRESHOLD_COMPLEX_MS,
  ): jest.CustomMatcherResult {
    const startTime = performance.now();

    try {
      received();
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      const pass = renderTime <= maxMs;

      if (pass) {
        return {
          message: () =>
            `Expected component not to render within ${maxMs}ms (took ${renderTime.toFixed(2)}ms)`,
          pass: true,
        };
      }
      return {
        message: () =>
          `Expected component to render within ${maxMs}ms, but took ${renderTime.toFixed(2)}ms`,
        pass: false,
      };
    } catch (error) {
      return {
        message: () =>
          `Expected component to render successfully, but threw error: ${error}`,
        pass: false,
      };
    }
  },
});

// Performance monitoring utilities for UI components
const performanceMonitor = {
  slowRenderThreshold: PERFORMANCE_RENDER_THRESHOLD_COMPLEX_MS, // 100ms for component renders
  memoryLeakThreshold: MEMORY_USAGE_THRESHOLD_MB * BYTES_PER_MB, // 50MB
  interactionThreshold: USER_INTERACTION_TIMEOUT_MS, // 50ms for user interactions

  logSlowRender(componentName: string, duration: number): void {
    if (
      duration > this.slowRenderThreshold &&
      process.env.NODE_ENV !== "test"
    ) {
      // Only log in development, not during tests
      // eslint-disable-next-line no-console
      console.warn(
        `⚠️ Slow render detected: "${componentName}" took ${duration.toFixed(2)}ms`,
      );
    }
  },

  logSlowInteraction(interactionType: string, duration: number): void {
    if (
      duration > this.interactionThreshold &&
      process.env.NODE_ENV !== "test"
    ) {
      // Only log in development, not during tests
      // eslint-disable-next-line no-console
      console.warn(
        `⚠️ Slow interaction: "${interactionType}" took ${duration.toFixed(2)}ms`,
      );
    }
  },

  logMemoryUsage(
    testName: string,
    before: NodeJS.MemoryUsage,
    after: NodeJS.MemoryUsage,
  ): void {
    const heapDelta = after.heapUsed - before.heapUsed;
    if (
      heapDelta > this.memoryLeakThreshold &&
      process.env.NODE_ENV !== "test"
    ) {
      // Only log in development, not during tests
      // eslint-disable-next-line no-console
      console.warn(
        `⚠️ Memory leak detected in "${testName}": +${Math.round(heapDelta / BYTES_PER_MB)}MB heap`,
      );
    }
  },
};

// Global test hooks for performance monitoring
let testStartTime: number;
let testStartMemory: NodeJS.MemoryUsage;

beforeEach(() => {
  testStartTime = Date.now();
  testStartMemory = process.memoryUsage();
});

afterEach(() => {
  const testName = expect.getState().currentTestName ?? "unknown";
  const duration = Date.now() - testStartTime;
  const endMemory = process.memoryUsage();

  performanceMonitor.logSlowRender(testName, duration);
  performanceMonitor.logMemoryUsage(testName, testStartMemory, endMemory);
});

// Test data factories for Bytebot UI objects
export const TestDataFactory = {
  /**
   * Creates a valid task for UI display
   */
  createUITask(
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      id: "550e8400-e29b-41d4-a716-446655440001",
      title: "Test Task",
      description: "This is a test task for UI validation",
      status: "pending",
      priority: "medium",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ["test", "ui"],
      assignee: {
        id: "550e8400-e29b-41d4-a716-446655440002",
        name: "Test User",
        avatar: "/test-avatar.png",
      },
      ...overrides,
    };
  },

  /**
   * Creates a valid Socket.io event
   */
  createSocketEvent(
    type: string,
    payload: Record<string, unknown> = {},
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      type,
      payload,
      timestamp: new Date().toISOString(),
      id: `event_${Date.now()}`,
      ...overrides,
    };
  },

  /**
   * Creates a valid chat message
   */
  createChatMessage(
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      id: "550e8400-e29b-41d4-a716-446655440003",
      content: "This is a test message",
      sender: {
        id: "550e8400-e29b-41d4-a716-446655440004",
        name: "Test Sender",
        avatar: "/test-sender.png",
        role: "assistant",
      },
      timestamp: new Date().toISOString(),
      type: "text",
      ...overrides,
    };
  },

  /**
   * Creates a valid user session
   */
  createUserSession(
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      user: {
        id: "550e8400-e29b-41d4-a716-446655440005",
        email: "testuser@example.com",
        name: "Test User",
        image: "/test-user.png",
      },
      expires: new Date(Date.now() + SESSION_EXPIRY_MS).toISOString(), // 24 hours from now
      accessToken: "test-access-token",
      ...overrides,
    };
  },
};

// Export test utilities for use in test files
export const TestUtils = {
  performanceMonitor,
  TestDataFactory,

  /**
   * Renders a component and returns testing utilities
   */
  renderComponent: (
    component: React.ReactElement,
    options?: Record<string, unknown>,
  ): RenderResult & { renderTime?: number } => {
    const startTime = performance.now();
    const result = render(component, options);
    const renderTime = performance.now() - startTime;

    performanceMonitor.logSlowRender("Component", renderTime);

    return {
      ...result,
      renderTime,
    };
  },

  /**
   * Creates user event utility with performance monitoring
   */
  createUserEvent: (): Record<string, unknown> => {
    const user = userEvent.setup();

    return {
      ...user,
      click: async (element: Element): Promise<void> => {
        const startTime = performance.now();
        await user.click(element);
        const duration = performance.now() - startTime;
        performanceMonitor.logSlowInteraction("click", duration);
      },
      type: async (element: Element, text: string): Promise<void> => {
        const startTime = performance.now();
        await user.type(element, text);
        const duration = performance.now() - startTime;
        performanceMonitor.logSlowInteraction("type", duration);
      },
    };
  },

  /**
   * Waits for element to appear with timeout
   */
  async waitForElement(
    selector: string,
    timeout = ASYNC_OPERATION_TIMEOUT_MS,
  ): Promise<HTMLElement> {
    return screen.findByTestId(selector, {}, { timeout });
  },

  /**
   * Simulates Socket.io connection
   */
  createMockSocket: (): Record<string, unknown> => ({
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    connected: true,
    id: "mock-socket-id",
  }),

  /**
   * Creates mock Next.js router
   */
  createMockRouter: (
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    pathname: "/",
    query: {},
    asPath: "/",
    route: "/",
    isReady: true,
    ...overrides,
  }),

  /**
   * Helper to test responsive behavior
   */
  testResponsive: (
    component: React.ReactElement,
    breakpoints: string[],
  ): unknown[] => {
    return breakpoints.map((breakpoint) => {
      // Mock different viewport sizes
      let width: number;
      if (breakpoint === "mobile") {
        width = MOBILE_BREAKPOINT_PX;
      } else if (breakpoint === "tablet") {
        width = TABLET_BREAKPOINT_PX;
      } else {
        width = DESKTOP_BREAKPOINT_PX;
      }

      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: width,
      });

      window.dispatchEvent(new Event("resize"));

      return TestUtils.renderComponent(component);
    });
  },

  /**
   * Helper to test dark/light mode
   */
  testThemeMode: (
    component: React.ReactElement,
    mode: "light" | "dark",
  ): ReturnType<typeof TestUtils.renderComponent> => {
    document.documentElement.classList.toggle("dark", mode === "dark");
    return TestUtils.renderComponent(component);
  },

  /**
   * Creates mock Task objects with default required properties
   * Useful for testing components that require Task objects
   */
  createMockTask: async (
    overrides: Partial<import("@/types").Task> = {},
  ): Promise<import("@/types").Task> => {
    const { TaskStatus, TaskPriority, TaskType, Role } = await import(
      "@/types"
    );

    return {
      id: "mock-task-id",
      title: "Mock Task",
      description: "Mock task description",
      type: TaskType.IMMEDIATE,
      status: TaskStatus.PENDING,
      priority: TaskPriority.MEDIUM,
      control: Role.USER,
      createdBy: Role.USER,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      model: {
        provider: "mock-provider",
        name: "mock-model",
        title: "Mock Model",
      },
      ...overrides,
    } as import("@/types").Task;
  },
};

// Note: Next.js mocks are moved to jest.config.js setupFiles to avoid circular dependencies

// Export test configuration
export const testConfig = {
  slowRenderThreshold: PERFORMANCE_RENDER_THRESHOLD_COMPLEX_MS,
  memoryLeakThreshold: MEMORY_USAGE_THRESHOLD_MB * BYTES_PER_MB,
  interactionThreshold: USER_INTERACTION_TIMEOUT_MS,
  timeout: 30000,
};
