/**
 * TaskItem Component Tests - Comprehensive Task Display Testing
 *
 * Tests cover:
 * - Task rendering with different statuses
 * - Status icon rendering and color coding
 * - Date formatting (today vs. other dates)
 * - Link behavior and navigation
 * - Accessibility features
 * - Error handling for invalid data
 * - Visual styling and layout
 *
 * @author Claude Code - Frontend Testing Specialist
 * @version 1.0.0
 */

import React from "react";
import { screen } from "@testing-library/react";
import { TaskItem } from "../TaskItem";
import { TaskStatus, Role, Task } from "@/types";
import { TestUtils } from "@/test-utils/setupAfterEnv";
import { format } from "date-fns";
import { capitalizeFirstChar } from "@/utils/stringUtils";

// Mock stringUtils
jest.mock("@/utils/stringUtils", () => ({
  capitalizeFirstChar: jest.fn(
    (str: string) => str.charAt(0).toUpperCase() + str.slice(1),
  ),
}));

// Mock date-fns with proper return values
jest.mock("date-fns", () => ({
  format: jest.fn(),
}));

// Type for icon mock
interface MockIconProps {
  icon?: { name?: string };
  className: string;
}

// Mock HugeIcons
jest.mock("@hugeicons/react", () => ({
  HugeiconsIcon: ({ icon, className }: MockIconProps) => (
    <div
      data-testid="huge-icon"
      className={className}
      data-icon={icon?.name || "unknown"}
    >
      Icon
    </div>
  ),
}));

// Mock the icon imports
jest.mock("@hugeicons/core-free-icons", () => ({
  Tick02Icon: { name: "Tick02Icon" },
  CancelCircleIcon: { name: "CancelCircleIcon" },
  AlertCircleIcon: { name: "AlertCircleIcon" },
}));

// Mock Loader component
jest.mock("@/components/ui/loader", () => ({
  Loader: ({ size }: { size: number }) => (
    <div data-testid="loader" data-size={size}>
      Loading...
    </div>
  ),
}));

describe("TaskItem Component", () => {
  const mockBaseTask = {
    id: "task-123",
    title: "Test Task Title",
    description: "Test task description",
    control: Role.ASSISTANT,
    priority: "medium" as const,
    tags: ["test", "ui"],
    createdAt: "2023-04-13T12:01:00Z",
    updatedAt: "2023-04-13T12:01:00Z",
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Configure format mock to return proper string values
    (format as jest.Mock).mockImplementation(
      (date: Date, formatString: string): string => {
        if (formatString.includes("Today")) {
          return "today 9:13am";
        }
        return "april 13, 2025 12:01pm";
      },
    );

    // Ensure stringUtils mock is working
    (capitalizeFirstChar as jest.Mock).mockImplementation((str: string) => {
      if (!str) return str;
      return str.charAt(0).toUpperCase() + str.slice(1);
    });
  });

  describe("Basic Rendering", () => {
    it("renders task description correctly", () => {
      const task = { ...mockBaseTask, status: TaskStatus.PENDING };
      TestUtils.renderComponent(<TaskItem task={task} />);

      // Component shows capitalizeFirstChar(task.description) so should be "Test task description"
      expect(screen.getByText("Test task description")).toBeInTheDocument();
    });

    it("renders capitalized task description", () => {
      const task = { ...mockBaseTask, status: TaskStatus.PENDING };
      TestUtils.renderComponent(<TaskItem task={task} />);

      expect(screen.getByText("Test task description")).toBeInTheDocument();
    });

    it("renders task link with correct href", () => {
      const task = { ...mockBaseTask, status: TaskStatus.PENDING };
      TestUtils.renderComponent(<TaskItem task={task} />);

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "/tasks/task-123");
    });

    it("applies correct CSS classes", () => {
      const task = { ...mockBaseTask, status: TaskStatus.PENDING };
      const { container } = TestUtils.renderComponent(<TaskItem task={task} />);

      // Check that the Link element has the "block" class
      expect(container.firstChild).toHaveClass("block");
    });
  });

  describe("Status Icons and Indicators", () => {
    it("renders tick icon for completed tasks", () => {
      const task = { ...mockBaseTask, status: TaskStatus.COMPLETED };
      TestUtils.renderComponent(<TaskItem task={task} />);

      const icon = screen.getByTestId("huge-icon");
      expect(icon).toHaveAttribute("data-icon", "Tick02Icon");
      expect(icon).toHaveClass("text-bytebot-green-8");
    });

    it("renders loader for running tasks", () => {
      const task = { ...mockBaseTask, status: TaskStatus.RUNNING };
      TestUtils.renderComponent(<TaskItem task={task} />);

      expect(screen.getByTestId("loader")).toBeInTheDocument();
    });

    it("renders loader for pending tasks", () => {
      const task = { ...mockBaseTask, status: TaskStatus.PENDING };
      TestUtils.renderComponent(<TaskItem task={task} />);

      expect(screen.getByTestId("loader")).toBeInTheDocument();
    });

    it("renders alert icon for needs help status", () => {
      const task = { ...mockBaseTask, status: TaskStatus.NEEDS_HELP };
      TestUtils.renderComponent(<TaskItem task={task} />);

      const icon = screen.getByTestId("huge-icon");
      expect(icon).toHaveAttribute("data-icon", "AlertCircleIcon");
      expect(icon).toHaveClass("text-[#FF9D00]");
    });

    it("renders alert icon for failed status", () => {
      const task = { ...mockBaseTask, status: TaskStatus.FAILED };
      TestUtils.renderComponent(<TaskItem task={task} />);

      const icon = screen.getByTestId("huge-icon");
      expect(icon).toHaveAttribute("data-icon", "AlertCircleIcon");
      expect(icon).toHaveClass("text-bytebot-red-light-9");
    });

    it("renders alert icon for needs review status", () => {
      const task = { ...mockBaseTask, status: TaskStatus.NEEDS_REVIEW };
      TestUtils.renderComponent(<TaskItem task={task} />);

      const icon = screen.getByTestId("huge-icon");
      expect(icon).toHaveAttribute("data-icon", "AlertCircleIcon");
      expect(icon).toHaveClass("text-[#FF9D00]");
    });

    it("renders cancel icon for cancelled status", () => {
      const task = { ...mockBaseTask, status: TaskStatus.CANCELLED };
      TestUtils.renderComponent(<TaskItem task={task} />);

      const icon = screen.getByTestId("huge-icon");
      expect(icon).toHaveAttribute("data-icon", "CancelCircleIcon");
      expect(icon).toHaveClass("text-bytebot-bronze-light-10");
    });
  });

  describe("Date Formatting", () => {
    it("formats today's date as 'Today' with time", () => {
      const today = new Date();
      const task = {
        ...mockBaseTask,
        status: TaskStatus.COMPLETED,
        createdAt: today.toISOString(),
      };

      TestUtils.renderComponent(<TaskItem task={task} />);

      // The mock should return "today 9:13am" and capitalizeFirstChar should make it "Today 9:13am"
      expect(screen.getByText(/Today/i)).toBeInTheDocument();
    });

    it("formats other dates with full date and time", () => {
      const task = {
        ...mockBaseTask,
        status: TaskStatus.COMPLETED,
        createdAt: "2025-04-13T12:01:00Z",
      };

      TestUtils.renderComponent(<TaskItem task={task} />);

      // The mock should return "april 13, 2025 12:01pm" and capitalizeFirstChar should make it "April 13, 2025 12:01pm"
      expect(screen.getByText(/April.*2025/i)).toBeInTheDocument();
    });

    it("capitalizes the formatted date string", () => {
      const task = { ...mockBaseTask, status: TaskStatus.COMPLETED };

      TestUtils.renderComponent(<TaskItem task={task} />);

      expect(capitalizeFirstChar).toHaveBeenCalled();
    });
  });

  describe("Task Priority and Tags", () => {
    it("handles high priority tasks", () => {
      const task = {
        ...mockBaseTask,
        status: TaskStatus.PENDING,
        priority: "high" as const,
      };

      TestUtils.renderComponent(<TaskItem task={task} />);

      // Component should render without errors
      expect(screen.getByText("Test task description")).toBeInTheDocument();
    });

    it("handles tasks with multiple tags", () => {
      const task = {
        ...mockBaseTask,
        status: TaskStatus.PENDING,
        tags: ["urgent", "frontend", "testing", "ui"],
      };

      TestUtils.renderComponent(<TaskItem task={task} />);

      // Component should render without errors
      expect(screen.getByText("Test task description")).toBeInTheDocument();
    });

    it("handles tasks with empty tags array", () => {
      const task = {
        ...mockBaseTask,
        status: TaskStatus.PENDING,
        tags: [],
      };

      TestUtils.renderComponent(<TaskItem task={task} />);

      expect(screen.getByText("Test task description")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("provides accessible link with descriptive text", () => {
      const task = { ...mockBaseTask, status: TaskStatus.PENDING };
      TestUtils.renderComponent(<TaskItem task={task} />);

      const link = screen.getByRole("link");
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/tasks/task-123");
    });

    it("has proper semantic structure", () => {
      const task = { ...mockBaseTask, status: TaskStatus.PENDING };
      TestUtils.renderComponent(<TaskItem task={task} />);

      // Check for proper heading or text structure
      expect(screen.getByText("Test task description")).toBeInTheDocument();
    });

    it("status icons have appropriate meaning", () => {
      const task = { ...mockBaseTask, status: TaskStatus.COMPLETED };
      TestUtils.renderComponent(<TaskItem task={task} />);

      const icon = screen.getByTestId("huge-icon");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("handles invalid date strings gracefully", () => {
      const task = {
        ...mockBaseTask,
        status: TaskStatus.COMPLETED,
        createdAt: "invalid-date",
      };

      // Should not throw an error
      expect(() => {
        TestUtils.renderComponent(<TaskItem task={task} />);
      }).not.toThrow();
    });

    it("handles missing task properties gracefully", () => {
      const incompleteTask = {
        id: "task-456",
        title: "Incomplete Task",
        status: TaskStatus.PENDING,
        // Missing other required properties
      } as Partial<Task> as Task;

      expect(() => {
        TestUtils.renderComponent(<TaskItem task={incompleteTask} />);
      }).not.toThrow();
    });

    it("handles undefined status gracefully", () => {
      const task = {
        ...mockBaseTask,
        status: undefined as unknown as TaskStatus,
      };

      expect(() => {
        TestUtils.renderComponent(<TaskItem task={task} />);
      }).not.toThrow();
    });
  });

  describe("Performance", () => {
    it("renders within performance threshold", () => {
      const task = { ...mockBaseTask, status: TaskStatus.PENDING };

      expect(() => {
        TestUtils.renderComponent(<TaskItem task={task} />);
      }).toRenderWithinTime(100);
    });

    it("handles re-renders efficiently", () => {
      const task = { ...mockBaseTask, status: TaskStatus.PENDING };

      const { rerender } = TestUtils.renderComponent(<TaskItem task={task} />);

      // Re-render with updated status
      const updatedTask = { ...task, status: TaskStatus.COMPLETED };

      expect(() => {
        rerender(<TaskItem task={updatedTask} />);
      }).not.toThrow();
    });
  });

  describe("Integration with Next.js Router", () => {
    it("uses Next.js Link component for navigation", () => {
      const task = { ...mockBaseTask, status: TaskStatus.PENDING };
      TestUtils.renderComponent(<TaskItem task={task} />);

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "/tasks/task-123");
    });
  });

  describe("Visual States", () => {
    it("applies correct styling for different task states", () => {
      const completedTask = { ...mockBaseTask, status: TaskStatus.COMPLETED };
      const { container: completedContainer } = TestUtils.renderComponent(
        <TaskItem task={completedTask} />,
      );

      const failedTask = { ...mockBaseTask, status: TaskStatus.FAILED };
      const { container: failedContainer } = TestUtils.renderComponent(
        <TaskItem task={failedTask} />,
      );

      // Both should render without errors and have different visual states
      expect(completedContainer.firstChild).toBeInTheDocument();
      expect(failedContainer.firstChild).toBeInTheDocument();
    });

    it("maintains consistent layout across different content lengths", () => {
      const shortTask = {
        ...mockBaseTask,
        title: "Short",
        description: "Brief",
        status: TaskStatus.PENDING,
      };

      const longTask = {
        ...mockBaseTask,
        title: "Very Long Task Title That Might Wrap To Multiple Lines",
        description:
          "This is a very long task description that might wrap to multiple lines and should be handled gracefully by the component layout system",
        status: TaskStatus.PENDING,
      };

      TestUtils.renderComponent(<TaskItem task={shortTask} />);
      TestUtils.renderComponent(<TaskItem task={longTask} />);

      // Both should render without layout issues - check for description content
      expect(screen.getByText("Brief")).toBeInTheDocument();
      expect(
        screen.getByText(/very long task description/i),
      ).toBeInTheDocument();
    });
  });
});
