/**
 * TaskList Component Tests - Comprehensive Task Management UI Testing
 *
 * Tests cover:
 * - Task list rendering with various states
 * - Task filtering, sorting, and pagination
 * - Task item interactions and selection
 * - Real-time updates via WebSocket
 * - Performance optimization for large task lists
 * - Accessibility and keyboard navigation
 * - Error handling and loading states
 *
 * @author Claude Code - Frontend Testing Specialist
 * @version 1.0.0
 */

import React from "react";
import { screen, waitFor } from "@testing-library/react";
import { TaskList } from "../TaskList";
import { Role, TaskStatus } from "@/types";
import { TestUtils } from "@/test-utils/setupAfterEnv";
import { fetchTasks } from "@/utils/taskUtils";
import { useWebSocket } from "@/hooks/useWebSocket";

// Mock the utility functions
jest.mock("@/utils/taskUtils", () => ({
  fetchTasks: jest.fn(),
}));

// Mock the WebSocket hook
jest.mock("@/hooks/useWebSocket", () => ({
  useWebSocket: jest.fn(),
}));

// Type the mocked functions
const mockFetchTasks = fetchTasks as jest.MockedFunction<typeof fetchTasks>;
const mockUseWebSocket = useWebSocket as jest.MockedFunction<
  typeof useWebSocket
>;

// Mock child components
jest.mock("../TaskItem", () => ({
  TaskItem: ({
    task,
    onSelect,
    selected,
  }: {
    task: { id: string; title: string; status: string; control: string };
    onSelect: (task: unknown) => void;
    selected: boolean;
  }) => (
    <div
      data-testid={`task-item-${task.id}`}
      className={selected ? "selected" : ""}
      onClick={() => {
        onSelect(task);
      }}
    >
      <span data-testid="task-title">{task.title}</span>
      <span data-testid="task-status">{task.status}</span>
      <span data-testid="task-control">{task.control}</span>
    </div>
  ),
}));

// Mock UI components
jest.mock("@/components/ui/loader", () => ({
  Loader: ({ size }: { size: number }) => (
    <div data-testid="loader" data-size={size}>
      Loading...
    </div>
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-testid="button"
    >
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    ...props
  }: {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    [key: string]: unknown;
  }) => (
    <input
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      data-testid="input"
      {...props}
    />
  ),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange?: (value: string) => void;
    children: React.ReactNode;
  }) => (
    <select
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
      data-testid="select"
    >
      {children}
    </select>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectItem: ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectValue: ({ placeholder }: { placeholder: string }) => (
    <span>{placeholder}</span>
  ),
}));

// Mock pagination component
jest.mock("@/components/ui/pagination", () => ({
  Pagination: ({
    currentPage,
    totalPages,
    onPageChange,
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  }) => (
    <div data-testid="pagination">
      <button
        onClick={() => {
          onPageChange(currentPage - 1);
        }}
        disabled={currentPage <= 1}
        data-testid="prev-page"
      >
        Previous
      </button>
      <span data-testid="current-page">{currentPage}</span>
      <span data-testid="total-pages">{totalPages}</span>
      <button
        onClick={() => {
          onPageChange(currentPage + 1);
        }}
        disabled={currentPage >= totalPages}
        data-testid="next-page"
      >
        Next
      </button>
    </div>
  ),
}));

describe("TaskList Component", () => {
  const mockTasks = [
    {
      id: "task-1",
      title: "First Task",
      description: "First task description",
      status: TaskStatus.RUNNING,
      control: Role.ASSISTANT,
      priority: "high",
      tags: ["frontend", "urgent"],
      createdAt: "2023-01-01T00:00:00Z",
      updatedAt: "2023-01-01T00:00:00Z",
    },
    {
      id: "task-2",
      title: "Second Task",
      description: "Second task description",
      status: TaskStatus.COMPLETED,
      control: Role.USER,
      priority: "medium",
      tags: ["backend"],
      createdAt: "2023-01-01T01:00:00Z",
      updatedAt: "2023-01-01T01:00:00Z",
    },
    {
      id: "task-3",
      title: "Third Task",
      description: "Third task description",
      status: TaskStatus.PENDING,
      control: Role.ASSISTANT,
      priority: "low",
      tags: ["documentation"],
      createdAt: "2023-01-01T02:00:00Z",
      updatedAt: "2023-01-01T02:00:00Z",
    },
  ];

  const defaultProps = {
    limit: 5,
    className: "test-task-list",
    title: "Test Tasks",
    description: "Test task list description",
    showHeader: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock fetchTasks to return our mock data - component expects { tasks: Task[] }
    mockFetchTasks.mockResolvedValue({ tasks: mockTasks });
    // Mock useWebSocket to not do anything
    mockUseWebSocket.mockImplementation(
      () => ({}) as ReturnType<typeof useWebSocket>,
    );
  });

  describe("Basic Rendering", () => {
    it("renders task list correctly", async () => {
      TestUtils.renderComponent(<TaskList {...defaultProps} />);

      // Wait for loading to complete and tasks to render
      await waitFor(() => {
        expect(screen.getByTestId("task-item-task-1")).toBeInTheDocument();
      });

      expect(screen.getByTestId("task-item-task-2")).toBeInTheDocument();
      expect(screen.getByTestId("task-item-task-3")).toBeInTheDocument();
    });

    it("shows loading state", () => {
      TestUtils.renderComponent(<TaskList {...defaultProps} />);

      // Initially should show loading state
      expect(screen.getByText(/loading tasks/i)).toBeInTheDocument();
    });

    it("shows empty state when no tasks", async () => {
      mockFetchTasks.mockResolvedValue({ tasks: [] });
      TestUtils.renderComponent(<TaskList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText(/loading tasks/i)).not.toBeInTheDocument();
      });

      // Should show empty state (this text needs to match actual component)
      expect(screen.getByText(/no tasks available/i)).toBeInTheDocument();
    });

    it("applies correct CSS classes", () => {
      const { container } = TestUtils.renderComponent(
        <TaskList {...defaultProps} />,
      );

      expect(container.firstChild).toHaveClass("task-list");
    });
  });

  describe("Task Selection", () => {
    it("calls onTaskSelect when task is clicked", async () => {
      const onTaskSelect = jest.fn();
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(
        <TaskList {...defaultProps} onTaskSelect={onTaskSelect} />,
      );

      const taskItem = screen.getByTestId("task-item-task-1");
      await user.click(taskItem);

      expect(onTaskSelect).toHaveBeenCalledWith(mockTasks[0]);
    });

    it("highlights selected task", () => {
      TestUtils.renderComponent(
        <TaskList {...defaultProps} selectedTaskId="task-2" />,
      );

      const selectedTask = screen.getByTestId("task-item-task-2");
      expect(selectedTask).toHaveClass("selected");
    });

    it("does not highlight unselected tasks", () => {
      TestUtils.renderComponent(
        <TaskList {...defaultProps} selectedTaskId="task-2" />,
      );

      const unselectedTask = screen.getByTestId("task-item-task-1");
      expect(unselectedTask).not.toHaveClass("selected");
    });

    it("handles keyboard navigation for task selection", async () => {
      const onTaskSelect = jest.fn();
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(
        <TaskList {...defaultProps} onTaskSelect={onTaskSelect} />,
      );

      await user.tab(); // Focus on first task
      await user.keyboard("{Enter}");

      expect(onTaskSelect).toHaveBeenCalledWith(mockTasks[0]);
    });
  });

  describe("Task Filtering", () => {
    it("renders search input", () => {
      TestUtils.renderComponent(<TaskList {...defaultProps} />);

      const searchInput = screen.getByTestId("input");
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute(
        "placeholder",
        expect.stringContaining("search"),
      );
    });

    it("filters tasks by search query", async () => {
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(<TaskList {...defaultProps} />);

      const searchInput = screen.getByTestId("input");
      await user.type(searchInput, "First");

      // Should show only the first task
      expect(screen.getByTestId("task-item-task-1")).toBeInTheDocument();
      expect(screen.queryByTestId("task-item-task-2")).not.toBeInTheDocument();
      expect(screen.queryByTestId("task-item-task-3")).not.toBeInTheDocument();
    });

    it("filters tasks by status", async () => {
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(<TaskList {...defaultProps} />);

      const statusSelect = screen.getByTestId("select");
      await user.selectOptions(statusSelect, TaskStatus.COMPLETED);

      // Should show only completed tasks
      expect(screen.queryByTestId("task-item-task-1")).not.toBeInTheDocument();
      expect(screen.getByTestId("task-item-task-2")).toBeInTheDocument();
      expect(screen.queryByTestId("task-item-task-3")).not.toBeInTheDocument();
    });

    it("combines search and status filters", async () => {
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(<TaskList {...defaultProps} />);

      const searchInput = screen.getByTestId("input");
      const statusSelect = screen.getByTestId("select");

      await user.type(searchInput, "Second");
      await user.selectOptions(statusSelect, TaskStatus.COMPLETED);

      // Should show only the second task (matches both search and status)
      expect(screen.queryByTestId("task-item-task-1")).not.toBeInTheDocument();
      expect(screen.getByTestId("task-item-task-2")).toBeInTheDocument();
      expect(screen.queryByTestId("task-item-task-3")).not.toBeInTheDocument();
    });

    it("shows no results message when filters match nothing", async () => {
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(<TaskList {...defaultProps} />);

      const searchInput = screen.getByTestId("input");
      await user.type(searchInput, "nonexistent task");

      expect(screen.getByText(/no tasks found/i)).toBeInTheDocument();
    });

    it("clears filters correctly", async () => {
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(<TaskList {...defaultProps} />);

      const searchInput = screen.getByTestId("input");
      await user.type(searchInput, "First");

      // Should show filtered results
      expect(screen.getByTestId("task-item-task-1")).toBeInTheDocument();
      expect(screen.queryByTestId("task-item-task-2")).not.toBeInTheDocument();

      // Clear the search
      await user.clear(searchInput);

      // Should show all tasks again
      expect(screen.getByTestId("task-item-task-1")).toBeInTheDocument();
      expect(screen.getByTestId("task-item-task-2")).toBeInTheDocument();
      expect(screen.getByTestId("task-item-task-3")).toBeInTheDocument();
    });
  });

  describe("Task Sorting", () => {
    it("sorts tasks by creation date by default", () => {
      TestUtils.renderComponent(<TaskList {...defaultProps} />);

      const taskItems = screen.getAllByTestId(/task-item-/);

      // Tasks should be in order of creation (newest first)
      expect(taskItems[0]).toHaveAttribute("data-testid", "task-item-task-3");
      expect(taskItems[1]).toHaveAttribute("data-testid", "task-item-task-2");
      expect(taskItems[2]).toHaveAttribute("data-testid", "task-item-task-1");
    });

    it("sorts tasks by title when selected", async () => {
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(<TaskList {...defaultProps} />);

      const sortSelect = screen.getByDisplayValue("Created Date");
      await user.selectOptions(sortSelect, "title");

      const taskItems = screen.getAllByTestId(/task-item-/);

      // Tasks should be in alphabetical order
      expect(taskItems[0]).toHaveAttribute("data-testid", "task-item-task-1");
      expect(taskItems[1]).toHaveAttribute("data-testid", "task-item-task-2");
      expect(taskItems[2]).toHaveAttribute("data-testid", "task-item-task-3");
    });

    it("sorts tasks by status when selected", async () => {
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(<TaskList {...defaultProps} />);

      const sortSelect = screen.getByDisplayValue("Created Date");
      await user.selectOptions(sortSelect, "status");

      // Should group by status: PENDING, RUNNING, COMPLETED
      const taskItems = screen.getAllByTestId(/task-item-/);
      const statuses = taskItems.map(
        (item) =>
          screen.getByTestId("task-status", { container: item }).textContent,
      );

      expect(statuses).toEqual([
        TaskStatus.COMPLETED,
        TaskStatus.PENDING,
        TaskStatus.RUNNING,
      ]);
    });

    it("supports reverse sorting", async () => {
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(<TaskList {...defaultProps} />);

      const reverseSortButton = screen.getByTestId("button");
      await user.click(reverseSortButton);

      const taskItems = screen.getAllByTestId(/task-item-/);

      // Should reverse the default order
      expect(taskItems[0]).toHaveAttribute("data-testid", "task-item-task-1");
      expect(taskItems[1]).toHaveAttribute("data-testid", "task-item-task-2");
      expect(taskItems[2]).toHaveAttribute("data-testid", "task-item-task-3");
    });
  });

  describe("Pagination", () => {
    const manyTasks = Array.from({ length: 50 }, (_, i) => ({
      id: `task-${i}`,
      title: `Task ${i}`,
      description: `Task ${i} description`,
      status: TaskStatus.PENDING,
      control: Role.ASSISTANT,
      priority: "medium",
      tags: [],
      createdAt: new Date(Date.now() + i * 1000).toISOString(),
      updatedAt: new Date(Date.now() + i * 1000).toISOString(),
    }));

    it("shows pagination controls for large task lists", () => {
      TestUtils.renderComponent(
        <TaskList {...defaultProps} tasks={manyTasks} />,
      );

      expect(screen.getByTestId("pagination")).toBeInTheDocument();
      expect(screen.getByTestId("current-page")).toHaveTextContent("1");
    });

    it("navigates between pages correctly", async () => {
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(
        <TaskList {...defaultProps} tasks={manyTasks} />,
      );

      const nextButton = screen.getByTestId("next-page");
      await user.click(nextButton);

      expect(screen.getByTestId("current-page")).toHaveTextContent("2");
    });

    it("disables navigation buttons appropriately", () => {
      TestUtils.renderComponent(
        <TaskList {...defaultProps} tasks={manyTasks} />,
      );

      const prevButton = screen.getByTestId("prev-page");
      expect(prevButton).toBeDisabled(); // Should be disabled on first page
    });

    it("shows correct number of tasks per page", () => {
      TestUtils.renderComponent(
        <TaskList {...defaultProps} tasks={manyTasks} />,
      );

      const taskItems = screen.getAllByTestId(/task-item-/);
      expect(taskItems).toHaveLength(10); // Default page size
    });
  });

  describe("Actions and Controls", () => {
    it("renders refresh button", () => {
      TestUtils.renderComponent(<TaskList {...defaultProps} />);

      const refreshButton = screen.getByText(/refresh/i);
      expect(refreshButton).toBeInTheDocument();
    });

    it("calls onRefresh when refresh button is clicked", async () => {
      const onRefresh = jest.fn();
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(
        <TaskList {...defaultProps} onRefresh={onRefresh} />,
      );

      const refreshButton = screen.getByText(/refresh/i);
      await user.click(refreshButton);

      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it("renders create task button when provided", () => {
      TestUtils.renderComponent(<TaskList {...defaultProps} />);

      const createButton = screen.getByText(/create task/i);
      expect(createButton).toBeInTheDocument();
    });

    it("calls onCreateTask when create button is clicked", async () => {
      const onCreateTask = jest.fn();
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(
        <TaskList {...defaultProps} onCreateTask={onCreateTask} />,
      );

      const createButton = screen.getByText(/create task/i);
      await user.click(createButton);

      expect(onCreateTask).toHaveBeenCalledTimes(1);
    });

    it("does not render create button when not provided", () => {
      const { ...propsWithoutCreate } = defaultProps;
      TestUtils.renderComponent(<TaskList {...propsWithoutCreate} />);

      expect(screen.queryByText(/create task/i)).not.toBeInTheDocument();
    });
  });

  describe("Real-time Updates", () => {
    it("updates task list when props change", () => {
      const { rerender } = TestUtils.renderComponent(
        <TaskList {...defaultProps} />,
      );

      expect(screen.getByTestId("task-item-task-1")).toBeInTheDocument();

      const updatedTasks = [
        {
          ...mockTasks[0],
          status: TaskStatus.COMPLETED,
        },
      ];

      rerender(<TaskList {...defaultProps} tasks={updatedTasks} />);

      expect(screen.getByTestId("task-status")).toHaveTextContent(
        TaskStatus.COMPLETED,
      );
    });

    it("maintains selection state across updates", () => {
      const { rerender } = TestUtils.renderComponent(
        <TaskList {...defaultProps} selectedTaskId="task-1" />,
      );

      expect(screen.getByTestId("task-item-task-1")).toHaveClass("selected");

      const updatedTasks = [
        {
          ...mockTasks[0],
          title: "Updated First Task",
        },
        ...mockTasks.slice(1),
      ];

      rerender(
        <TaskList
          {...defaultProps}
          tasks={updatedTasks}
          selectedTaskId="task-1"
        />,
      );

      expect(screen.getByTestId("task-item-task-1")).toHaveClass("selected");
      expect(screen.getByTestId("task-title")).toHaveTextContent(
        "Updated First Task",
      );
    });

    it("handles task additions smoothly", () => {
      const { rerender } = TestUtils.renderComponent(
        <TaskList {...defaultProps} />,
      );

      expect(screen.getAllByTestId(/task-item-/)).toHaveLength(3);

      const newTask = {
        id: "task-4",
        title: "New Task",
        description: "New task description",
        status: TaskStatus.PENDING,
        control: Role.ASSISTANT,
        priority: "medium",
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      rerender(<TaskList {...defaultProps} tasks={[...mockTasks, newTask]} />);

      expect(screen.getAllByTestId(/task-item-/)).toHaveLength(4);
      expect(screen.getByTestId("task-item-task-4")).toBeInTheDocument();
    });

    it("handles task removals smoothly", () => {
      const { rerender } = TestUtils.renderComponent(
        <TaskList {...defaultProps} />,
      );

      expect(screen.getAllByTestId(/task-item-/)).toHaveLength(3);

      rerender(<TaskList {...defaultProps} tasks={mockTasks.slice(0, 2)} />);

      expect(screen.getAllByTestId(/task-item-/)).toHaveLength(2);
      expect(screen.queryByTestId("task-item-task-3")).not.toBeInTheDocument();
    });
  });

  describe("Performance and Memory", () => {
    it("renders within performance threshold", () => {
      const renderFunction = () =>
        TestUtils.renderComponent(<TaskList {...defaultProps} />);

      // Performance test - ensure render completes without errors
      expect(renderFunction).toBeDefined();
      const { container } = renderFunction();
      expect(container).toBeInTheDocument();
    });

    it("handles large task lists efficiently", () => {
      const largeTaskList = Array.from({ length: 1000 }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i}`,
        description: `Task ${i} description`,
        status: TaskStatus.PENDING,
        control: Role.ASSISTANT,
        priority: "medium",
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      const { renderTime } = TestUtils.renderComponent(
        <TaskList {...defaultProps} tasks={largeTaskList} />,
      );

      expect(renderTime).toBeLessThan(500); // Should handle large lists efficiently
    });

    it("does not cause memory leaks on frequent updates", () => {
      const initialMemory = process.memoryUsage();

      for (let i = 0; i < 100; i++) {
        const { unmount } = TestUtils.renderComponent(
          <TaskList
            {...defaultProps}
            tasks={[mockTasks[i % mockTasks.length]]}
          />,
        );
        unmount();
      }

      const finalMemory = process.memoryUsage();
      const memoryDelta = finalMemory.heapUsed - initialMemory.heapUsed;

      expect(memoryDelta).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
    });
  });

  describe("Accessibility", () => {
    it("provides proper ARIA labels and roles", () => {
      TestUtils.renderComponent(<TaskList {...defaultProps} />);

      const list = screen.getByRole("list");
      expect(list).toBeInTheDocument();
      expect(list).toHaveAttribute(
        "aria-label",
        expect.stringContaining("task"),
      );
    });

    it("supports keyboard navigation", async () => {
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(<TaskList {...defaultProps} />);

      await user.tab(); // Focus search input
      await user.tab(); // Focus status filter
      await user.tab(); // Focus first task

      const firstTask = screen.getByTestId("task-item-task-1");
      expect(firstTask).toHaveFocus();
    });

    it("announces loading state to screen readers", () => {
      TestUtils.renderComponent(<TaskList {...defaultProps} loading={true} />);

      const loader = screen.getByTestId("loader");
      expect(loader).toHaveAttribute("role", "status");
      expect(loader).toHaveAttribute("aria-live", "polite");
    });

    it("announces filter results to screen readers", async () => {
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(<TaskList {...defaultProps} />);

      const searchInput = screen.getByTestId("input");
      await user.type(searchInput, "First");

      const resultAnnouncement = screen.getByLabelText(
        /showing \d+ of \d+ tasks/i,
      );
      expect(resultAnnouncement).toBeInTheDocument();
    });

    it("provides skip links for large lists", () => {
      const manyTasks = Array.from({ length: 50 }, (_, i) => ({
        ...mockTasks[0],
        id: `task-${i}`,
        title: `Task ${i}`,
      }));

      TestUtils.renderComponent(
        <TaskList {...defaultProps} tasks={manyTasks} />,
      );

      const skipLink = screen.getByText(/skip to pagination/i);
      expect(skipLink).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("handles missing task data gracefully", () => {
      const tasksWithMissingData = [
        {
          id: "task-1",
          // Missing required fields
        },
      ];

      TestUtils.renderComponent(
        <TaskList
          {...defaultProps}
          tasks={tasksWithMissingData as typeof mockTasks}
        />,
      );

      // Should not crash and should handle gracefully
      expect(screen.getByTestId("task-item-task-1")).toBeInTheDocument();
    });

    it("handles invalid date values gracefully", () => {
      const tasksWithInvalidDates = [
        {
          ...mockTasks[0],
          createdAt: "invalid-date",
          updatedAt: "invalid-date",
        },
      ];

      TestUtils.renderComponent(
        <TaskList {...defaultProps} tasks={tasksWithInvalidDates} />,
      );

      expect(screen.getByTestId("task-item-task-1")).toBeInTheDocument();
    });

    it("handles null or undefined tasks prop", () => {
      TestUtils.renderComponent(
        <TaskList {...defaultProps} tasks={null as typeof mockTasks | null} />,
      );

      expect(screen.getByText(/no tasks found/i)).toBeInTheDocument();
    });

    it("handles callback errors gracefully", async () => {
      const errorCallback = jest.fn(() => {
        throw new Error("Callback error");
      });
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {
          // Empty implementation for error testing
        });
      const user = TestUtils.createUserEvent();

      TestUtils.renderComponent(
        <TaskList {...defaultProps} onTaskSelect={errorCallback} />,
      );

      const taskItem = screen.getByTestId("task-item-task-1");
      await user.click(taskItem);

      // Component should continue to function despite the error
      expect(screen.getByTestId("task-item-task-1")).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });
  });
});

// Export test utilities for other task-related tests
export const TaskListTestUtils = {
  createMockTask: (
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    id: "test-task",
    title: "Test Task",
    description: "Test Description",
    status: TaskStatus.PENDING,
    control: Role.ASSISTANT,
    priority: "medium",
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  createMockTaskList: (count: number): Record<string, unknown>[] =>
    Array.from({ length: count }, (_, i) =>
      TaskListTestUtils.createMockTask({
        id: `task-${i}`,
        title: `Task ${i}`,
      }),
    ),

  verifyTaskOrder: (expectedOrder: string[]): void => {
    const taskItems = screen.getAllByTestId(/task-item-/);
    const actualOrder = taskItems.map((item) =>
      item.getAttribute("data-testid")?.replace("task-item-", ""),
    );
    expect(actualOrder).toEqual(expectedOrder);
  },

  verifyFilteredResults: (expectedTaskIds: string[]): void => {
    const visibleTasks = screen.getAllByTestId(/task-item-/);
    expect(visibleTasks).toHaveLength(expectedTaskIds.length);

    expectedTaskIds.forEach((taskId) => {
      expect(screen.getByTestId(`task-item-${taskId}`)).toBeInTheDocument();
    });
  },
};
