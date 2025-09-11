/**
 * Custom Jest Matcher Type Definitions for Bytebot-UI
 *
 * Extends Jest's expect API with custom matchers for:
 * - UI component testing
 * - Performance validation
 * - Accessibility testing
 * - Tailwind CSS class validation
 * - Socket.io event validation
 *
 * @author Claude Code - Testing TypeScript Specialist
 * @version 1.0.0
 */

import { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";
import { expect } from "@jest/globals";

declare global {
  namespace jest {
    interface CustomMatcherResult {
      pass: boolean;
      message: () => string;
    }

    interface Matchers<_R = unknown> {
      /**
       * Validates that a React element has specific Tailwind classes
       */
      toHaveTailwindClass(className: string): CustomMatcherResult;

      /**
       * Validates Socket.io event structure
       */
      toBeValidSocketEvent(): CustomMatcherResult;

      /**
       * Validates task UI representation
       */
      toBeValidTaskUI(): CustomMatcherResult;

      /**
       * Validates that an element is accessible
       */
      toBeAccessible(): CustomMatcherResult;

      /**
       * Validates component render performance
       */
      toRenderWithinTime(maxMs?: number): CustomMatcherResult;
    }

    interface Expect extends TestingLibraryMatchers<typeof expect> {
      /**
       * Validates that a React element has specific Tailwind classes
       */
      toHaveTailwindClass(
        received: HTMLElement,
        className: string,
      ): CustomMatcherResult;

      /**
       * Validates Socket.io event structure
       */
      toBeValidSocketEvent(received: unknown): CustomMatcherResult;

      /**
       * Validates task UI representation
       */
      toBeValidTaskUI(received: unknown): CustomMatcherResult;

      /**
       * Validates that an element is accessible
       */
      toBeAccessible(received: HTMLElement): CustomMatcherResult;

      /**
       * Validates component render performance
       */
      toRenderWithinTime(
        received: () => unknown,
        maxMs?: number,
      ): CustomMatcherResult;
    }
  }
}

// Ensure this file is treated as a module
export {};
