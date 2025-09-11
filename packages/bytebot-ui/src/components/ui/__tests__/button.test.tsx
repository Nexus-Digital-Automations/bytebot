/**
 * Button Component Tests - Comprehensive UI Testing Suite
 *
 * Tests cover:
 * - Component rendering and props validation
 * - All button variants and sizes
 * - User interactions (click, hover, focus, keyboard)
 * - Accessibility compliance (ARIA, keyboard navigation)
 * - Custom icon positioning and slots
 * - Performance and memory leak detection
 * - Responsive behavior and theme integration
 *
 * @author Claude Code - Frontend Testing Specialist
 * @version 1.0.0
 */

import React from "react";
import { screen } from "@testing-library/react";
import { Button, buttonVariants } from "../button";
import { TestUtils } from "@/test-utils/setupAfterEnv";

// Test icon components
const TestIcon = () => <span data-testid="test-icon">📄</span>;
const AnotherIcon = () => <span data-testid="another-icon">🔄</span>;

describe("Button Component", () => {
  describe("Basic Rendering", () => {
    it("renders correctly with default props", () => {
      const { renderTime } = TestUtils.renderComponent(
        <Button>Click me</Button>,
      );

      const button = screen.getByRole("button", { name: "Click me" });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass(
        "cursor-pointer",
        "inline-flex",
        "items-center",
      );
      expect(renderTime).toBeLessThan(50); // Performance check
    });

    it("renders with custom className", () => {
      TestUtils.renderComponent(
        <Button className="custom-class">Custom Button</Button>,
      );

      const button = screen.getByRole("button");
      expect(button).toHaveClass("custom-class");
    });

    it("applies data-slot attribute correctly", () => {
      TestUtils.renderComponent(<Button>Test</Button>);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("data-slot", "button");
    });

    it("renders as different elements when asChild is true", () => {
      TestUtils.renderComponent(
        <Button asChild>
          <a href="#test">Link Button</a>
        </Button>,
      );

      const link = screen.getByRole("link");
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "#test");
      expect(link).toHaveClass("cursor-pointer");
    });
  });

  describe("Button Variants", () => {
    const variants = [
      { variant: "default" as const, expectedClass: "bg-primary" },
      { variant: "destructive" as const, expectedClass: "bg-destructive" },
      { variant: "outline" as const, expectedClass: "border" },
      { variant: "secondary" as const, expectedClass: "bg-secondary" },
      { variant: "ghost" as const, expectedClass: "hover:bg-accent" },
      { variant: "link" as const, expectedClass: "text-primary" },
    ];

    variants.forEach(({ variant, expectedClass }): void => {
      it(`renders ${variant} variant correctly`, () => {
        TestUtils.renderComponent(
          <Button variant={variant}>{variant} Button</Button>,
        );

        const button = screen.getByRole("button");
        expect(button).toHaveClass(expectedClass);
      });
    });
  });

  describe("Button Sizes", () => {
    const sizes = [
      { size: "default" as const, expectedClass: "h-9" },
      { size: "sm" as const, expectedClass: "h-8" },
      { size: "lg" as const, expectedClass: "h-10" },
      { size: "icon" as const, expectedClass: "size-9" },
    ];

    sizes.forEach(({ size, expectedClass }) => {
      it(`renders ${size} size correctly`, () => {
        TestUtils.renderComponent(<Button size={size}>{size} Button</Button>);

        const button = screen.getByRole("button");
        expect(button).toHaveClass(expectedClass);
      });
    });
  });

  describe("Icon Integration", () => {
    it("renders icon on the left by default", () => {
      TestUtils.renderComponent(
        <Button icon={<TestIcon />}>Button with Icon</Button>,
      );

      const icon = screen.getByTestId("test-icon");

      expect(icon).toBeInTheDocument();
      // Check if icon comes before text in DOM order
      expect(icon.parentElement).toHaveClass("mr-1");
    });

    it("renders icon on the right when specified", () => {
      TestUtils.renderComponent(
        <Button icon={<TestIcon />} iconPosition="right">
          Button with Right Icon
        </Button>,
      );

      const icon = screen.getByTestId("test-icon");
      expect(icon).toBeInTheDocument();
      expect(icon.parentElement).toHaveClass("ml-1");
    });

    it("does not render icon when not provided", () => {
      TestUtils.renderComponent(<Button>No Icon Button</Button>);

      expect(screen.queryByTestId("test-icon")).not.toBeInTheDocument();
    });

    it("handles complex icon components correctly", () => {
      TestUtils.renderComponent(
        <Button icon={<AnotherIcon />} iconPosition="left">
          Complex Icon
        </Button>,
      );

      const icon = screen.getByTestId("another-icon");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    it("handles click events correctly", async () => {
      const handleClick = jest.fn();
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(
        <Button onClick={handleClick}>Clickable Button</Button>,
      );

      const button = screen.getByRole("button");
      await user.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("does not call onClick when disabled", async () => {
      const handleClick = jest.fn();
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(
        <Button onClick={handleClick} disabled>
          Disabled Button
        </Button>,
      );

      const button = screen.getByRole("button");
      await user.click(button);

      expect(handleClick).not.toHaveBeenCalled();
      expect(button).toHaveClass("disabled:pointer-events-none");
    });

    it("handles keyboard navigation correctly", async () => {
      const handleClick = jest.fn();
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(
        <Button onClick={handleClick}>Keyboard Button</Button>,
      );

      const button = screen.getByRole("button");
      button.focus();
      await user.keyboard("{Enter}");

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("handles space key activation", async () => {
      const handleClick = jest.fn();
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(
        <Button onClick={handleClick}>Space Button</Button>,
      );

      const button = screen.getByRole("button");
      button.focus();
      await user.keyboard(" ");

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA attributes", () => {
      TestUtils.renderComponent(
        <Button aria-label="Custom button label">Button</Button>,
      );

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-label", "Custom button label");
    });

    it("is keyboard accessible", () => {
      TestUtils.renderComponent(<Button>Accessible Button</Button>);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("tabindex", "0");
    });

    it("shows focus indicators", () => {
      TestUtils.renderComponent(<Button>Focus Button</Button>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("focus-visible:ring-ring/50");
    });

    it("indicates disabled state properly", () => {
      TestUtils.renderComponent(<Button disabled>Disabled Button</Button>);

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      expect(button).toHaveClass("disabled:opacity-50");
    });

    it("supports screen reader text", () => {
      TestUtils.renderComponent(
        <Button>
          <span className="sr-only">Screen reader text</span>
          Visual text
        </Button>,
      );

      expect(screen.getByText("Screen reader text")).toBeInTheDocument();
      expect(screen.getByText("Visual text")).toBeInTheDocument();
    });
  });

  describe("Variant Class Generation", () => {
    it("generates correct classes for default variant and size", () => {
      const classes = buttonVariants();
      expect(classes).toContain("bg-primary");
      expect(classes).toContain("h-9");
    });

    it("generates correct classes for custom variant and size", () => {
      const classes = buttonVariants({
        variant: "destructive",
        size: "lg",
      });
      expect(classes).toContain("bg-destructive");
      expect(classes).toContain("h-10");
    });

    it("merges custom className correctly", () => {
      const customClass = "my-custom-class";
      const classes = buttonVariants({
        variant: "outline",
        className: customClass,
      });
      expect(classes).toContain("border");
      expect(classes).toContain(customClass);
    });
  });

  describe("Performance and Memory", () => {
    it("renders within performance threshold", () => {
      const renderFunction = () =>
        TestUtils.renderComponent(<Button>Performance Test</Button>);

      expect(renderFunction).toRenderWithinTime(50);
    });

    it("does not cause memory leaks on re-render", () => {
      const initialMemory = process.memoryUsage();

      // Render component multiple times
      for (let i = 0; i < 100; i++) {
        const { unmount } = TestUtils.renderComponent(
          <Button key={i}>Button {i}</Button>,
        );
        unmount();
      }

      const finalMemory = process.memoryUsage();
      const memoryDelta = finalMemory.heapUsed - initialMemory.heapUsed;

      // Should not increase memory by more than 10MB
      expect(memoryDelta).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe("Theme Integration", () => {
    it("applies dark mode classes correctly", () => {
      TestUtils.testThemeMode(
        <Button variant="destructive">Dark Button</Button>,
        "dark",
      );

      const button = screen.getByRole("button");
      expect(button).toHaveClass("dark:bg-destructive/60");
    });

    it("applies light mode classes correctly", () => {
      TestUtils.testThemeMode(
        <Button variant="outline">Light Button</Button>,
        "light",
      );

      const button = screen.getByRole("button");
      expect(button).toHaveClass("border-bytebot-bronze-light-7");
    });
  });

  describe("Error Handling", () => {
    it("handles missing children gracefully", () => {
      TestUtils.renderComponent(<Button />);

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      expect(button).toBeEmptyDOMElement();
    });

    it("handles invalid variant gracefully", () => {
      // TypeScript would prevent this, but testing runtime behavior
      TestUtils.renderComponent(
        <Button variant={"invalid" as never}>Invalid Variant</Button>,
      );

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      // Should fall back to default variant
      expect(button).toHaveClass("bg-primary");
    });
  });

  describe("Form Integration", () => {
    it('submits forms when type="submit"', async () => {
      const handleSubmit = jest.fn((e: React.FormEvent) => {
        e.preventDefault();
      });
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(
        <form onSubmit={handleSubmit}>
          <Button type="submit">Submit</Button>
        </form>,
      );

      const button = screen.getByRole("button");
      await user.click(button);

      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });

    it('does not submit forms when type="button"', async () => {
      const handleSubmit = jest.fn((e: React.FormEvent) => {
        e.preventDefault();
      });
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(
        <form onSubmit={handleSubmit}>
          <Button type="button">Button</Button>
        </form>,
      );

      const button = screen.getByRole("button");
      await user.click(button);

      expect(handleSubmit).not.toHaveBeenCalled();
    });
  });

  describe("Responsive Behavior", () => {
    it("maintains functionality across different viewport sizes", () => {
      const breakpoints = ["mobile", "tablet", "desktop"];

      breakpoints.forEach((breakpoint) => {
        const renderResult = TestUtils.testResponsive(
          <Button>Responsive Button</Button>,
          [breakpoint],
        )[0];

        if (
          renderResult != null &&
          typeof renderResult.unmount === "function"
        ) {
          const button = screen.getByRole("button");
          expect(button).toBeInTheDocument();
          expect(button).toHaveClass("cursor-pointer");

          renderResult.unmount();
        }
      });
    });
  });
});

// Additional test utilities specific to Button component
export const ButtonTestUtils = {
  /**
   * Creates a button with all possible props for comprehensive testing
   */
  createFullyProppedButton: (
    overrides: Record<string, unknown> = {},
  ): React.JSX.Element => (
    <Button
      variant="default"
      size="default"
      icon={<TestIcon />}
      iconPosition="left"
      onClick={jest.fn()}
      disabled={false}
      className="test-button"
      aria-label="Test button"
      {...overrides}
    >
      Test Button
    </Button>
  ),

  /**
   * Tests all button variants systematically
   */
  testAllVariants: (testFn: (variant: string) => void): void => {
    const variants = [
      "default",
      "destructive",
      "outline",
      "secondary",
      "ghost",
      "link",
    ];
    variants.forEach(testFn);
  },

  /**
   * Tests all button sizes systematically
   */
  testAllSizes: (testFn: (size: string) => void): void => {
    const sizes = ["default", "sm", "lg", "icon"];
    sizes.forEach(testFn);
  },
};
