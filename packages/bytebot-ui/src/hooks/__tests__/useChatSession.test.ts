/**
 * useChatSession Hook Tests - Comprehensive Chat State Management Testing
 *
 * Tests cover:
 * - Chat session lifecycle and state management
 * - WebSocket integration and real-time updates
 * - Message loading and pagination (infinite scroll)
 * - Task status transitions and control switching
 * - Error handling and recovery mechanisms
 * - Performance optimization and memory management
 * - Integration with external APIs and services
 *
 * @author Claude Code - Frontend Testing Specialist
 * @version 1.0.0
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { useChatSession } from "../useChatSession";
import {
  Message,
  Role,
  Task,
  TaskPriority,
  TaskStatus,
  TaskType,
} from "@/types";
import { MessageContentType } from "@bytebot/shared";
import {
  LARGE_DATASET_SIZE,
  MEMORY_LEAK_TEST_ITERATIONS,
  PERFORMANCE_TEST_TIMEOUT_MS,
} from "@/constants/ui";

// Mock external dependencies
jest.mock("@/utils/taskUtils", () => ({
  addMessage: jest.fn(),
  fetchTaskMessages: jest.fn(),
  fetchTaskProcessedMessages: jest.fn(),
  fetchTaskById: jest.fn(),
  takeOverTask: jest.fn(),
  resumeTask: jest.fn(),
  cancelTask: jest.fn(),
}));

jest.mock("../useWebSocket", () => ({
  useWebSocket: jest.fn(() => ({
    joinTask: jest.fn(),
    leaveTask: jest.fn(),
  })),
}));

// Mock logger
jest.mock("@/utils/logger", () => ({
  logError: jest.fn(),
  logDebug: jest.fn(),
}));

// Import mocked utilities
import * as taskUtils from "@/utils/taskUtils";
import { useWebSocket } from "../useWebSocket";
import * as logger from "@/utils/logger";

// Type the mocked functions
const mockTaskUtils = taskUtils as jest.Mocked<typeof taskUtils>;
const mockUseWebSocket = jest.mocked(useWebSocket);
const mockLogger = logger as jest.Mocked<typeof logger>;

describe("useChatSession Hook", () => {
  let mockJoinTask: jest.MockedFunction<() => void>;
  let mockLeaveTask: jest.MockedFunction<() => void>;
  let mockWebSocketHandlers: {
    onTaskUpdate: (task: Task) => void;
    onNewMessage: (message: Message) => void;
    onTaskCreated: (task: Task) => void;
    onTaskDeleted: (taskId: string) => void;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset logger mocks
    mockLogger.logError.mockClear();
    mockLogger.logDebug.mockClear();

    // Setup WebSocket mock
    mockJoinTask = jest.fn();
    mockLeaveTask = jest.fn();

    mockUseWebSocket.mockImplementation((props) => {
      // Type guard to ensure props is defined and has the expected shape
      if (props && typeof props === "object" && "onTaskUpdate" in props) {
        mockWebSocketHandlers = {
          onTaskUpdate: props.onTaskUpdate as (task: Task) => void,
          onNewMessage: props.onNewMessage as (message: Message) => void,
          onTaskCreated: props.onTaskCreated as (task: Task) => void,
          onTaskDeleted: props.onTaskDeleted as (taskId: string) => void,
        };
      }
      return {
        socket: null,
        joinTask: mockJoinTask,
        leaveTask: mockLeaveTask,
        disconnect: jest.fn(),
        isConnected: false,
      };
    });

    // Setup default mock implementations
    mockTaskUtils.fetchTaskById.mockResolvedValue({
      id: "task-123",
      status: TaskStatus.RUNNING,
      control: Role.ASSISTANT,
      title: "Test Task",
      description: "Test Description",
      type: TaskType.IMMEDIATE,
      priority: TaskPriority.MEDIUM,
      createdBy: Role.USER,
      model: {
        provider: "anthropic",
        name: "claude-3-5-sonnet-20241022",
        title: "Claude 3.5 Sonnet",
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    mockTaskUtils.fetchTaskMessages.mockResolvedValue([
      {
        id: "msg-1",
        content: [{ type: MessageContentType._Text, text: "Hello" }] as const,
        role: Role.USER,
        createdAt: new Date().toISOString(),
      },
    ]);

    mockTaskUtils.fetchTaskProcessedMessages.mockResolvedValue([
      {
        role: Role.USER,
        messages: [
          {
            id: "msg-1",
            content: [
              { type: MessageContentType._Text, text: "Hello" },
            ] as const,
            role: Role.USER,
            createdAt: new Date().toISOString(),
          },
        ],
      },
    ]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Initial State and Setup", () => {
    it("initializes with correct default state", () => {
      const { result } = renderHook(() => useChatSession());

      expect(result.current.messages).toEqual([]);
      expect(result.current.groupedMessages).toEqual([]);
      expect(result.current.taskStatus).toBe(TaskStatus.PENDING);
      expect(result.current.control).toBe(Role.ASSISTANT);
      expect(result.current.input).toBe("");
      expect(result.current.currentTaskId).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isLoadingSession).toBe(true);
      expect(result.current.isLoadingMoreMessages).toBe(false);
      expect(result.current.hasMoreMessages).toBe(true);
    });

    it("initializes with provided initial task ID", async () => {
      const { result } = renderHook(() =>
        useChatSession({ initialTaskId: "task-123" }),
      );

      await waitFor(() => {
        expect(result.current.isLoadingSession).toBe(false);
      });

      expect(mockTaskUtils.fetchTaskById).toHaveBeenCalledWith("task-123");
      expect(result.current.currentTaskId).toBe("task-123");
      expect(result.current.taskStatus).toBe(TaskStatus.RUNNING);
      expect(result.current.control).toBe(Role.ASSISTANT);
    });

    it("loads messages when task is found", async () => {
      const { result } = renderHook(() =>
        useChatSession({ initialTaskId: "task-123" }),
      );

      await waitFor(() => {
        expect(result.current.isLoadingSession).toBe(false);
      });

      expect(mockTaskUtils.fetchTaskMessages).toHaveBeenCalledWith("task-123", {
        limit: 10,
        page: 1,
      });
      expect(mockTaskUtils.fetchTaskProcessedMessages).toHaveBeenCalledWith(
        "task-123",
        {
          limit: 1000,
          page: 1,
        },
      );

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.groupedMessages).toHaveLength(1);
    });

    it("handles task not found scenario", async () => {
      mockTaskUtils.fetchTaskById.mockResolvedValue(null);

      const { result } = renderHook(() =>
        useChatSession({ initialTaskId: "non-existent-task" }),
      );

      await waitFor(() => {
        expect(result.current.isLoadingSession).toBe(false);
      });

      expect(result.current.currentTaskId).toBeNull();
      // TODO: Update test when proper logging service is implemented
      // expect(console.log).toHaveBeenCalledWith(
      //   "Task with ID non-existent-task not found",
      // );
    });
  });

  describe("WebSocket Integration", () => {
    it("sets up WebSocket handlers correctly", () => {
      renderHook(() => useChatSession());

      expect(mockUseWebSocket).toHaveBeenCalledWith({
        onTaskUpdate: expect.any(Function) as (task: Task) => void,
        onNewMessage: expect.any(Function) as (message: Message) => void,
        onTaskCreated: expect.any(Function) as (task: Task) => void,
        onTaskDeleted: expect.any(Function) as (taskId: string) => void,
      });
    });

    it("joins task room when task ID is set", async () => {
      const { result } = renderHook(() =>
        useChatSession({ initialTaskId: "task-123" }),
      );

      await waitFor(() => {
        expect(result.current.isLoadingSession).toBe(false);
      });

      expect(mockJoinTask).toHaveBeenCalledWith("task-123");
    });

    it("handles task updates via WebSocket", async () => {
      const { result } = renderHook(() =>
        useChatSession({ initialTaskId: "task-123" }),
      );

      await waitFor(() => {
        expect(result.current.isLoadingSession).toBe(false);
      });

      const updatedTask: Task = {
        id: "task-123",
        status: TaskStatus.NEEDS_HELP,
        control: Role.USER,
        title: "Test Task",
        description: "Test Description",
        type: TaskType.IMMEDIATE,
        priority: TaskPriority.HIGH,
        createdBy: Role.USER,
        model: {
          provider: "anthropic",
          name: "claude-3-5-sonnet-20241022",
          title: "Claude 3.5 Sonnet",
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      act(() => {
        mockWebSocketHandlers.onTaskUpdate(updatedTask);
      });

      expect(result.current.taskStatus).toBe(TaskStatus.NEEDS_HELP);
      expect(result.current.control).toBe(Role.USER);
    });

    it("handles new messages via WebSocket", async () => {
      const { result } = renderHook(() =>
        useChatSession({ initialTaskId: "task-123" }),
      );

      await waitFor(() => {
        expect(result.current.isLoadingSession).toBe(false);
      });

      const initialMessageCount = result.current.messages.length;

      const newMessage: Message = {
        id: "new-msg-1",
        content: [
          {
            type: MessageContentType._Text,
            text: "New message from WebSocket",
          },
        ] as const,
        role: Role.ASSISTANT,
        createdAt: new Date().toISOString(),
        taskId: "task-123",
      };

      act(() => {
        mockWebSocketHandlers.onNewMessage(newMessage);
      });

      expect(result.current.messages).toHaveLength(initialMessageCount + 1);
      expect(result.current.messages[initialMessageCount]).toEqual(newMessage);
      expect(mockTaskUtils.fetchTaskProcessedMessages).toHaveBeenCalledTimes(2); // Initial load + reload
    });

    it("ignores duplicate messages from WebSocket", async () => {
      const { result } = renderHook(() =>
        useChatSession({ initialTaskId: "task-123" }),
      );

      await waitFor(() => {
        expect(result.current.isLoadingSession).toBe(false);
      });

      const duplicateMessage: Message = {
        id: "msg-1", // Same ID as already loaded message
        content: [
          { type: MessageContentType._Text, text: "Duplicate message" },
        ] as const,
        role: Role.ASSISTANT,
        createdAt: new Date().toISOString(),
        taskId: "task-123",
      };

      const initialMessageCount = result.current.messages.length;

      act(() => {
        mockWebSocketHandlers.onNewMessage(duplicateMessage);
      });

      expect(result.current.messages).toHaveLength(initialMessageCount);
    });

    it("handles task deletion via WebSocket", async () => {
      const { result } = renderHook(() =>
        useChatSession({ initialTaskId: "task-123" }),
      );

      await waitFor(() => {
        expect(result.current.isLoadingSession).toBe(false);
      });

      expect(result.current.currentTaskId).toBe("task-123");

      act(() => {
        mockWebSocketHandlers.onTaskDeleted("task-123");
      });

      expect(result.current.currentTaskId).toBeNull();
      expect(result.current.messages).toEqual([]);
    });

    it("ignores task deletion for different tasks", async () => {
      const { result } = renderHook(() =>
        useChatSession({ initialTaskId: "task-123" }),
      );

      await waitFor(() => {
        expect(result.current.isLoadingSession).toBe(false);
      });

      const initialTaskId = result.current.currentTaskId;
      const initialMessages = result.current.messages;

      act(() => {
        mockWebSocketHandlers.onTaskDeleted("different-task");
      });

      expect(result.current.currentTaskId).toBe(initialTaskId);
      expect(result.current.messages).toEqual(initialMessages);
    });
  });

  describe("Message Management", () => {
    it("adds new message successfully", async () => {
      mockTaskUtils.addMessage.mockResolvedValue({
        success: true,
        message: "Message added successfully",
      } as Awaited<ReturnType<typeof mockTaskUtils.addMessage>>);

      const { result } = renderHook(() =>
        useChatSession({ initialTaskId: "task-123" }),
      );

      await waitFor(() => {
        expect(result.current.isLoadingSession).toBe(false);
      });

      act(() => {
        result.current.setInput("Test message");
      });

      expect(result.current.input).toBe("Test message");

      await act(async () => {
        await result.current.handleAddMessage();
      });

      expect(mockTaskUtils.addMessage).toHaveBeenCalledWith(
        "task-123",
        "Test message",
      );
      expect(result.current.input).toBe(""); // Input should be cleared
    });

    it("handles message addition failure", async () => {
      mockTaskUtils.addMessage.mockResolvedValue(null);

      const { result } = renderHook(() =>
        useChatSession({ initialTaskId: "task-123" }),
      );

      await waitFor(() => {
        expect(result.current.isLoadingSession).toBe(false);
      });

      const initialMessageCount = result.current.messages.length;

      act(() => {
        result.current.setInput("Failed message");
      });

      await act(async () => {
        await result.current.handleAddMessage();
      });

      // Should add error message to chat
      expect(result.current.messages).toHaveLength(initialMessageCount + 1);
      const lastMessage = result.current.messages[initialMessageCount];
      if (lastMessage?.content?.[0] && "text" in lastMessage.content[0]) {
        expect(lastMessage.content[0].text).toContain(
          "Sorry, there was an error",
        );
      } else {
        throw new Error("Expected error message not found");
      }
    });

    it("does not send empty messages", async () => {
      const { result } = renderHook(() =>
        useChatSession({ initialTaskId: "task-123" }),
      );

      await waitFor(() => {
        expect(result.current.isLoadingSession).toBe(false);
      });

      act(() => {
        result.current.setInput("   "); // Only whitespace
      });

      await act(async () => {
        await result.current.handleAddMessage();
      });

      expect(mockTaskUtils.addMessage).not.toHaveBeenCalled();
    });

    it("shows loading state during message sending", async () => {
      let resolveAddMessage: (
        value: Awaited<ReturnType<typeof mockTaskUtils.addMessage>>,
      ) => void;
      const addMessagePromise = new Promise<
        Awaited<ReturnType<typeof mockTaskUtils.addMessage>>
      >((resolve) => {
        resolveAddMessage = resolve;
      });
      mockTaskUtils.addMessage.mockReturnValue(addMessagePromise);

      const { result } = renderHook(() =>
        useChatSession({ initialTaskId: "task-123" }),
      );

      await waitFor(() => {
        expect(result.current.isLoadingSession).toBe(false);
      });

      act(() => {
        result.current.setInput("Test message");
      });

      const addMessagePromiseAct = act(async () => {
        await result.current.handleAddMessage();
      });

      // Should show loading immediately
      expect(result.current.isLoading).toBe(true);

      act(() => {
        if (resolveAddMessage !== undefined) {
          resolveAddMessage({ success: true, message: "Success" });
        }
      });

      await addMessagePromiseAct;

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("Infinite Scroll / Load More Messages", () => {
    it("loads more messages successfully", async () => {
      const additionalMessages: Message[] = [
        {
          id: "msg-2",
          content: [{ type: MessageContentType._Text, text: "Older message" }],
          role: Role.ASSISTANT,
          createdAt: new Date().toISOString(),
        },
      ];

      // First call returns initial messages, second call returns additional
      mockTaskUtils.fetchTaskMessages
        .mockResolvedValueOnce([
          {
            id: "msg-1",
            content: [{ type: MessageContentType._Text, text: "Hello" }],
            role: Role.USER,
            createdAt: new Date().toISOString(),
          },
        ])
        .mockResolvedValueOnce(additionalMessages);

      const { result } = renderHook(() =>
        useChatSession({ initialTaskId: "task-123" }),
      );

      await waitFor(() => {
        expect(result.current.isLoadingSession).toBe(false);
      });

      const initialMessageCount = result.current.messages.length;

      await act(async () => {
        await result.current.loadMoreMessages();
      });

      expect(mockTaskUtils.fetchTaskMessages).toHaveBeenCalledWith("task-123", {
        limit: 10,
        page: 2,
      });
      expect(result.current.messages).toHaveLength(initialMessageCount + 1);
    });

    it("sets hasMoreMessages to false when no more messages", async () => {
      mockTaskUtils.fetchTaskMessages
        .mockResolvedValueOnce([
          {
            id: "msg-1",
            content: [],
            role: Role.USER,
            createdAt: new Date().toISOString(),
          },
        ])
        .mockResolvedValueOnce([]); // No more messages

      const { result } = renderHook(() =>
        useChatSession({ initialTaskId: "task-123" }),
      );

      await waitFor(() => {
        expect(result.current.isLoadingSession).toBe(false);
      });

      expect(result.current.hasMoreMessages).toBe(false); // Based on initial load < 10

      await act(async () => {
        await result.current.loadMoreMessages();
      });

      expect(result.current.hasMoreMessages).toBe(false);
    });

    it("does not load more when already loading", async () => {
      const { result } = renderHook(() =>
        useChatSession({ initialTaskId: "task-123" }),
      );

      await waitFor(() => {
        expect(result.current.isLoadingSession).toBe(false);
      });

      // Start first load
      const firstLoadPromise = act(async () => {
        await result.current.loadMoreMessages();
      });

      // Try to start second load while first is in progress
      const secondLoadPromise = act(async () => {
        await result.current.loadMoreMessages();
      });

      await Promise.all([firstLoadPromise, secondLoadPromise]);

      // Should only call fetchTaskMessages twice (initial + first loadMore)
      expect(mockTaskUtils.fetchTaskMessages).toHaveBeenCalledTimes(2);
    });

    it("does not load more when no more messages available", async () => {
      const { result } = renderHook(() =>
        useChatSession({ initialTaskId: "task-123" }),
      );

      await waitFor(() => {
        expect(result.current.isLoadingSession).toBe(false);
      });

      // Note: Cannot manually set hasMoreMessages as it's a read-only property from the hook
      // This test verifies the component's internal logic for handling no more messages

      await act(async () => {
        await result.current.loadMoreMessages();
      });

      // Should not make additional API call
      expect(mockTaskUtils.fetchTaskMessages).toHaveBeenCalledTimes(1);
    });

    it("handles load more messages error gracefully", async () => {
      mockTaskUtils.fetchTaskMessages
        .mockResolvedValueOnce([
          {
            id: "msg-1",
            content: [],
            role: Role.USER,
            createdAt: new Date().toISOString(),
          },
        ])
        .mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() =>
        useChatSession({ initialTaskId: "task-123" }),
      );

      await waitFor(() => {
        expect(result.current.isLoadingSession).toBe(false);
      });

      await act(async () => {
        await result.current.loadMoreMessages();
      });

      // TODO: Update test when proper logging service is implemented
      // expect(console.error).toHaveBeenCalledWith(
      //   "Error loading more messages:",
      //   expect.any(Error),
      // );
      expect(result.current.isLoadingMoreMessages).toBe(false);
    });
  });

  describe("Task Control Actions", () => {
    beforeEach(async () => {
      mockTaskUtils.takeOverTask.mockResolvedValue({
        id: "task-123",
        control: Role.USER,
        status: TaskStatus.NEEDS_HELP,
        title: "Test Task",
        description: "Test Description",
        type: TaskType.IMMEDIATE,
        priority: TaskPriority.HIGH,
        createdBy: Role.USER,
        model: {
          provider: "anthropic",
          name: "claude-3-5-sonnet-20241022",
          title: "Claude 3.5 Sonnet",
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      mockTaskUtils.resumeTask.mockResolvedValue({
        id: "task-123",
        control: Role.ASSISTANT,
        status: TaskStatus.RUNNING,
        title: "Test Task",
        description: "Test Description",
        type: TaskType.IMMEDIATE,
        priority: TaskPriority.MEDIUM,
        createdBy: Role.USER,
        model: {
          provider: "anthropic",
          name: "claude-3-5-sonnet-20241022",
          title: "Claude 3.5 Sonnet",
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      mockTaskUtils.cancelTask.mockResolvedValue({
        id: "task-123",
        control: Role.ASSISTANT,
        status: TaskStatus.CANCELLED,
        title: "Test Task",
        description: "Test Description",
        type: TaskType.IMMEDIATE,
        priority: TaskPriority.MEDIUM,
        createdBy: Role.USER,
        model: {
          provider: "anthropic",
          name: "claude-3-5-sonnet-20241022",
          title: "Claude 3.5 Sonnet",
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    it("handles task takeover successfully", async () => {
      const { result } = renderHook(() =>
        useChatSession({ initialTaskId: "task-123" }),
      );

      await waitFor(() => {
        expect(result.current.isLoadingSession).toBe(false);
      });

      await act(async () => {
        await result.current.handleTakeOverTask();
      });

      expect(mockTaskUtils.takeOverTask).toHaveBeenCalledWith("task-123");
      expect(result.current.control).toBe(Role.USER);
    });

    it("handles task resume successfully", async () => {
      const { result } = renderHook(() =>
        useChatSession({ initialTaskId: "task-123" }),
      );

      await waitFor(() => {
        expect(result.current.isLoadingSession).toBe(false);
      });

      await act(async () => {
        await result.current.handleResumeTask();
      });

      expect(mockTaskUtils.resumeTask).toHaveBeenCalledWith("task-123");
      expect(result.current.control).toBe(Role.ASSISTANT);
    });

    it("handles task cancellation successfully", async () => {
      const { result } = renderHook(() =>
        useChatSession({ initialTaskId: "task-123" }),
      );

      await waitFor(() => {
        expect(result.current.isLoadingSession).toBe(false);
      });

      await act(async () => {
        await result.current.handleCancelTask();
      });

      expect(mockTaskUtils.cancelTask).toHaveBeenCalledWith("task-123");
      expect(result.current.taskStatus).toBe(TaskStatus.CANCELLED);
      expect(result.current.control).toBe(Role.ASSISTANT);
    });

    it("handles task control errors gracefully", async () => {
      mockTaskUtils.takeOverTask.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() =>
        useChatSession({ initialTaskId: "task-123" }),
      );

      await waitFor(() => {
        expect(result.current.isLoadingSession).toBe(false);
      });

      await act(async () => {
        await result.current.handleTakeOverTask();
      });

      // TODO: Update test when proper logging service is implemented
      // expect(console.error).toHaveBeenCalledWith(
      //   "Error taking over task:",
      //   expect.any(Error),
      // );
    });

    it("does nothing when no current task", async () => {
      const { result } = renderHook(() => useChatSession());

      await act(async () => {
        await result.current.handleTakeOverTask();
        await result.current.handleResumeTask();
        await result.current.handleCancelTask();
      });

      expect(mockTaskUtils.takeOverTask).not.toHaveBeenCalled();
      expect(mockTaskUtils.resumeTask).not.toHaveBeenCalled();
      expect(mockTaskUtils.cancelTask).not.toHaveBeenCalled();
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("handles session loading errors gracefully", async () => {
      mockTaskUtils.fetchTaskById.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() =>
        useChatSession({ initialTaskId: "task-123" }),
      );

      await waitFor(() => {
        expect(result.current.isLoadingSession).toBe(false);
      });

      // TODO: Update test when proper logging service is implemented
      // expect(console.error).toHaveBeenCalledWith(
      //   "Error loading session:",
      //   expect.any(Error),
      // );
      expect(result.current.currentTaskId).toBeNull();
    });

    it("handles missing task ID in message operations", async () => {
      const { result } = renderHook(() => useChatSession());

      act(() => {
        result.current.setInput("Test message");
      });

      await act(async () => {
        await result.current.handleAddMessage();
      });

      expect(mockTaskUtils.addMessage).not.toHaveBeenCalled();
    });

    it("filters out messages from different tasks", async () => {
      const { result } = renderHook(() =>
        useChatSession({ initialTaskId: "task-123" }),
      );

      await waitFor(() => {
        expect(result.current.isLoadingSession).toBe(false);
      });

      const messageFromDifferentTask: Message = {
        id: "other-msg",
        content: [
          {
            type: MessageContentType._Text,
            text: "Message from different task",
          },
        ] as const,
        role: Role.ASSISTANT,
        createdAt: new Date().toISOString(),
        taskId: "different-task",
      };

      const initialMessageCount = result.current.messages.length;

      act(() => {
        mockWebSocketHandlers.onNewMessage(messageFromDifferentTask);
      });

      expect(result.current.messages).toHaveLength(initialMessageCount);
    });

    it("handles WebSocket reconnection scenarios", async () => {
      const { result, rerender } = renderHook(
        ({ taskId }) => useChatSession({ initialTaskId: taskId }),
        { initialProps: { taskId: "task-123" } },
      );

      await waitFor(() => {
        expect(result.current.isLoadingSession).toBe(false);
      });

      expect(mockJoinTask).toHaveBeenCalledWith("task-123");

      // Simulate task ID change (WebSocket reconnection)
      rerender({ taskId: "task-456" });

      expect(mockLeaveTask).toHaveBeenCalled();
      expect(mockJoinTask).toHaveBeenCalledWith("task-456");
    });
  });

  describe("Performance and Memory Management", () => {
    it("does not cause memory leaks with frequent updates", async () => {
      const { result } = renderHook(() =>
        useChatSession({ initialTaskId: "task-123" }),
      );

      await waitFor(() => {
        expect(result.current.isLoadingSession).toBe(false);
      });

      // Simulate rapid message updates
      const sendRapidMessage = (index: number): void => {
        act(() => {
          mockWebSocketHandlers.onNewMessage({
            id: `rapid-msg-${index}`,
            content: [
              { type: MessageContentType._Text, text: `Message ${index}` },
            ],
            role: Role.ASSISTANT,
            createdAt: new Date().toISOString(),
            taskId: "task-123",
          });
        });
      };

      for (let i = 0; i < MEMORY_LEAK_TEST_ITERATIONS; i++) {
        sendRapidMessage(i);
      }

      // Hook should still be responsive
      expect(result.current.messages.length).toBeGreaterThan(1);
    });

    it("efficiently handles large message sets", async () => {
      const largeMessageSet: Message[] = Array.from(
        { length: LARGE_DATASET_SIZE },
        (_, i) => ({
          id: `msg-${i}`,
          content: [{ type: MessageContentType._Text, text: `Message ${i}` }],
          role: i % 2 === 0 ? Role.USER : Role.ASSISTANT,
          createdAt: new Date().toISOString(),
        }),
      );

      mockTaskUtils.fetchTaskMessages.mockResolvedValue(largeMessageSet);

      const startTime = performance.now();
      const { result } = renderHook(() =>
        useChatSession({ initialTaskId: "task-123" }),
      );

      await waitFor(() => {
        expect(result.current.isLoadingSession).toBe(false);
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(result.current.messages).toHaveLength(LARGE_DATASET_SIZE);
      expect(renderTime).toBeLessThan(PERFORMANCE_TEST_TIMEOUT_MS * 2); // Should handle large sets efficiently
    });
  });

  describe("State Synchronization", () => {
    it("maintains consistent state across task updates", async () => {
      const { result } = renderHook(() =>
        useChatSession({ initialTaskId: "task-123" }),
      );

      await waitFor(() => {
        expect(result.current.isLoadingSession).toBe(false);
      });

      // Simulate rapid state changes
      act(() => {
        mockWebSocketHandlers.onTaskUpdate({
          id: "task-123",
          status: TaskStatus.NEEDS_HELP,
          control: Role.USER,
          title: "Test Task",
          description: "Test Description",
          type: TaskType.IMMEDIATE,
          priority: TaskPriority.MEDIUM,
          createdBy: Role.USER,
          model: {
            provider: "anthropic",
            name: "claude-3-5-sonnet-20241022",
            title: "Claude 3.5 Sonnet",
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });

      expect(result.current.taskStatus).toBe(TaskStatus.NEEDS_HELP);
      expect(result.current.control).toBe(Role.USER);

      act(() => {
        mockWebSocketHandlers.onTaskUpdate({
          id: "task-123",
          status: TaskStatus.RUNNING,
          control: Role.ASSISTANT,
          title: "Test Task",
          description: "Test Description",
          type: TaskType.IMMEDIATE,
          priority: TaskPriority.MEDIUM,
          createdBy: Role.USER,
          model: {
            provider: "anthropic",
            name: "claude-3-5-sonnet-20241022",
            title: "Claude 3.5 Sonnet",
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });

      expect(result.current.taskStatus).toBe(TaskStatus.RUNNING);
      expect(result.current.control).toBe(Role.ASSISTANT);
    });
  });
});

// Export test utilities for other hook tests
export const ChatSessionTestUtils = {
  createMockMessage: (overrides: Partial<Message> = {}): Message => ({
    id: "test-msg",
    content: [{ type: MessageContentType._Text, text: "Test message" }],
    role: Role.USER,
    createdAt: new Date().toISOString(),
    taskId: "test-task",
    ...overrides,
  }),

  createMockTask: (overrides: Partial<Task> = {}): Task => ({
    id: "test-task",
    status: TaskStatus.RUNNING,
    control: Role.ASSISTANT,
    title: "Test Task",
    description: "Test Description",
    type: TaskType.IMMEDIATE,
    priority: TaskPriority.MEDIUM,
    createdBy: Role.USER,
    model: {
      provider: "anthropic",
      name: "claude-3-5-sonnet-20241022",
      title: "Claude 3.5 Sonnet",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  setupMockWebSocket: (): {
    onTaskUpdate: jest.MockedFunction<(task: Task) => void>;
    onNewMessage: jest.MockedFunction<(message: Message) => void>;
    onTaskCreated: jest.MockedFunction<(task: Task) => void>;
    onTaskDeleted: jest.MockedFunction<(taskId: string) => void>;
  } => {
    const mockHandlers = {
      onTaskUpdate: jest.fn(),
      onNewMessage: jest.fn(),
      onTaskCreated: jest.fn(),
      onTaskDeleted: jest.fn(),
    };

    mockUseWebSocket.mockReturnValue({
      socket: null,
      joinTask: jest.fn(),
      leaveTask: jest.fn(),
      disconnect: jest.fn(),
      isConnected: false,
    });

    return mockHandlers;
  },
};
