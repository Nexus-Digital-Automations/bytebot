import { useCallback, useEffect, useRef, useState } from "react";
import { GroupedMessages, Message, Role, Task, TaskStatus } from "@/types";
import {
  addMessage,
  cancelTask,
  fetchTaskById,
  fetchTaskMessages,
  fetchTaskProcessedMessages,
  resumeTask,
  takeOverTask,
} from "@/utils/taskUtils";
import { MessageContentType } from "@bytebot/shared";
import { useWebSocket } from "./useWebSocket";
import { logDebug, logError } from "@/utils/logger";

/**
 * Configuration interface for the useChatSession hook
 */
interface UseChatSessionProps {
  /** Optional initial task ID to load */
  initialTaskId?: string;
}

/**
 * Response type for task operation functions
 */
interface TaskOperationResponse {
  success: boolean;
  task?: Task;
  error?: string;
}

/**
 * Type guard to check if a value is a valid string ID
 */
function isValidTaskId(taskId: unknown): taskId is string {
  return typeof taskId === "string" && taskId.trim().length > 0;
}

/**
 * Error handling utility for async operations
 */
function handleAsyncError(
  operation: string,
  error: unknown,
  context: string,
): void {
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  const errorStack = error instanceof Error ? error.stack : undefined;

  logError(
    `Error in ${operation}`,
    {
      message: errorMessage,
      stack: errorStack,
      context,
    },
    "useChatSession",
  );
}

/**
 * Custom React hook for managing chat session state and operations
 * Handles WebSocket connections, message loading, and task operations
 *
 * @param props - Configuration options for the chat session
 * @returns Object containing all chat session state and handlers
 */
export function useChatSession({ initialTaskId }: UseChatSessionProps = {}) {
  // State management for task and chat functionality
  const [taskStatus, setTaskStatus] = useState<TaskStatus>(TaskStatus.PENDING);
  const [control, setControl] = useState<Role>(Role.ASSISTANT);
  const [messages, setMessages] = useState<Message[]>([]);
  const [groupedMessages, setGroupedMessages] = useState<GroupedMessages[]>([]);
  const [input, setInput] = useState<string>("");
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(
    initialTaskId || null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] =
    useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(true);

  // Ref for tracking processed message IDs to prevent duplicates
  const processedMessageIds = useRef<Set<string>>(new Set());

  /**
   * WebSocket event handler for task updates
   * Updates local state when the current task changes
   */
  const handleTaskUpdate = useCallback(
    (task: Task) => {
      if (!task?.id || !currentTaskId) {
        logDebug(
          "Invalid task update received",
          { task, currentTaskId },
          "useChatSession",
        );
        return;
      }

      if (task.id === currentTaskId) {
        logDebug(
          "Updating task status",
          {
            taskId: task.id,
            status: task.status,
            control: task.control,
          },
          "useChatSession",
        );
        setTaskStatus(task.status);
        setControl(task.control);
      }
    },
    [currentTaskId],
  );

  /**
   * Reloads grouped messages for the current task
   * Used for refreshing the chat UI after new messages arrive
   */
  const reloadGroupedMessages = useCallback(async (): Promise<void> => {
    if (!isValidTaskId(currentTaskId)) {
      logDebug(
        "No valid task ID for reloading grouped messages",
        { currentTaskId },
        "useChatSession",
      );
      return;
    }

    try {
      logDebug(
        "Reloading grouped messages",
        { taskId: currentTaskId },
        "useChatSession",
      );
      const processedMessages = await fetchTaskProcessedMessages(
        currentTaskId,
        {
          limit: 1000, // Get more messages for grouped view
          page: 1,
        },
      );

      if (Array.isArray(processedMessages)) {
        setGroupedMessages(processedMessages);
        logDebug(
          "Successfully reloaded grouped messages",
          {
            taskId: currentTaskId,
            messageCount: processedMessages.length,
          },
          "useChatSession",
        );
      } else {
        logError(
          "Invalid grouped messages response",
          { processedMessages },
          "useChatSession",
        );
      }
    } catch (error: unknown) {
      handleAsyncError(
        "reloading grouped messages",
        error,
        "reloadGroupedMessages",
      );
    }
  }, [currentTaskId]);

  /**
   * WebSocket event handler for new messages
   * Adds new messages to the chat and updates grouped messages
   */
  const handleNewMessage = useCallback(
    (message: Message) => {
      // Validate message structure
      if (!message?.id || !message?.taskId) {
        logError(
          "Invalid message received from WebSocket",
          { message },
          "useChatSession",
        );
        return;
      }

      // Only add message if it's not already processed and belongs to current task
      if (
        !processedMessageIds.current.has(message.id) &&
        message.taskId === currentTaskId
      ) {
        logDebug(
          "Adding new message from WebSocket",
          { messageId: message.id, taskId: message.taskId },
          "useChatSession",
        );
        processedMessageIds.current.add(message.id);
        setMessages((prev: Message[]) => [...prev, message]);

        // Reload grouped messages to reflect the new message
        // Use void to explicitly ignore the promise return
        void reloadGroupedMessages();
      } else {
        logDebug(
          "Message already processed or not for current task",
          {
            messageId: message.id,
            taskId: message.taskId,
            currentTaskId,
            alreadyProcessed: processedMessageIds.current.has(message.id),
          },
          "useChatSession",
        );
      }
    },
    [currentTaskId, reloadGroupedMessages],
  );

  /**
   * WebSocket event handler for task creation
   * Currently just logs the event for debugging
   */
  const handleTaskCreated = useCallback((task: Task) => {
    if (!task?.id) {
      logError("Invalid task created event", { task }, "useChatSession");
      return;
    }

    logDebug(
      "New task created",
      { taskId: task.id, title: task.title },
      "useChatSession",
    );
  }, []);

  /**
   * WebSocket event handler for task deletion
   * Clears current task state if the deleted task was active
   */
  const handleTaskDeleted = useCallback(
    (taskId: string) => {
      if (!isValidTaskId(taskId)) {
        logError(
          "Invalid task ID in deletion event",
          { taskId },
          "useChatSession",
        );
        return;
      }

      if (taskId === currentTaskId) {
        logDebug("Current task was deleted", { taskId }, "useChatSession");
        setCurrentTaskId(null);
        setMessages([]);
        setGroupedMessages([]);
        processedMessageIds.current = new Set();
        setCurrentPage(1);
        setHasMoreMessages(true);
      } else {
        logDebug(
          "Deleted task was not current task",
          {
            deletedTaskId: taskId,
            currentTaskId,
          },
          "useChatSession",
        );
      }
    },
    [currentTaskId],
  );

  // Initialize WebSocket connection with typed event handlers
  const { joinTask, leaveTask } = useWebSocket({
    onTaskUpdate: handleTaskUpdate,
    onNewMessage: handleNewMessage,
    onTaskCreated: handleTaskCreated,
    onTaskDeleted: handleTaskDeleted,
  });

  /**
   * Loads more messages for infinite scroll functionality
   * Implements pagination and prevents duplicate message loading
   */
  const loadMoreMessages = useCallback(async (): Promise<void> => {
    if (
      !isValidTaskId(currentTaskId) ||
      isLoadingMoreMessages ||
      !hasMoreMessages
    ) {
      logDebug(
        "Skipping loadMoreMessages",
        {
          currentTaskId: currentTaskId || "null",
          isLoadingMoreMessages,
          hasMoreMessages,
        },
        "useChatSession",
      );
      return;
    }

    setIsLoadingMoreMessages(true);

    try {
      const nextPage = currentPage + 1;
      logDebug(
        "Loading more messages",
        {
          taskId: currentTaskId,
          page: nextPage,
          limit: 10,
        },
        "useChatSession",
      );

      const newMessages = await fetchTaskMessages(currentTaskId, {
        limit: 10,
        page: nextPage,
      });

      if (!Array.isArray(newMessages)) {
        logError(
          "Invalid messages response",
          { newMessages },
          "useChatSession",
        );
        return;
      }

      if (newMessages.length === 0) {
        logDebug(
          "No more messages available",
          { taskId: currentTaskId, page: nextPage },
          "useChatSession",
        );
        setHasMoreMessages(false);
      } else {
        // Validate and format messages
        const validMessages = newMessages.filter((msg): msg is Message => {
          const isValid =
            msg &&
            typeof msg === "object" &&
            typeof msg.id === "string" &&
            msg.id.length > 0;
          if (!isValid) {
            logError(
              "Invalid message in response",
              { message: msg },
              "useChatSession",
            );
          }
          return isValid;
        });

        // Append new messages to the end of the list (newer messages)
        const formattedMessages: Message[] = validMessages.map(
          (msg: Message) => ({
            id: msg.id,
            content: msg.content,
            role: msg.role,
            createdAt: msg.createdAt,
            taskId: msg.taskId, // Ensure taskId is preserved
          }),
        );

        // Filter out any messages we already have
        const uniqueMessages = formattedMessages.filter(
          (msg: Message) => !processedMessageIds.current.has(msg.id),
        );

        if (uniqueMessages.length > 0) {
          // Add message IDs to processed set
          uniqueMessages.forEach((msg: Message) => {
            processedMessageIds.current.add(msg.id);
          });

          setMessages((prev: Message[]) => [...prev, ...uniqueMessages]);
          setCurrentPage(nextPage);

          logDebug(
            "Added new messages",
            {
              taskId: currentTaskId,
              newMessageCount: uniqueMessages.length,
              totalMessages: uniqueMessages.length,
            },
            "useChatSession",
          );
        } else {
          logDebug(
            "All messages were duplicates",
            {
              taskId: currentTaskId,
              fetchedCount: formattedMessages.length,
            },
            "useChatSession",
          );
        }

        // If we got fewer messages than requested, we've reached the end
        if (newMessages.length < 10) {
          setHasMoreMessages(false);
        }
      }
    } catch (error: unknown) {
      handleAsyncError("loading more messages", error, "loadMoreMessages");
    } finally {
      setIsLoadingMoreMessages(false);
    }
  }, [currentTaskId, currentPage, isLoadingMoreMessages, hasMoreMessages]);

  /**
   * Load task ID from URL parameter or fetch the latest task on initial render
   * Handles initial session setup and data loading
   */
  useEffect(() => {
    const loadSession = async (): Promise<void> => {
      setIsLoadingSession(true);

      try {
        if (!isValidTaskId(initialTaskId)) {
          logDebug(
            "No initial task ID provided",
            { initialTaskId },
            "useChatSession",
          );
          return;
        }

        logDebug(
          "Loading session for task",
          { taskId: initialTaskId },
          "useChatSession",
        );

        // Fetch task data, messages, and processed messages concurrently
        const [task, messages, processedMessages] = await Promise.allSettled([
          fetchTaskById(initialTaskId),
          fetchTaskMessages(initialTaskId, { limit: 10, page: 1 }),
          fetchTaskProcessedMessages(initialTaskId, { limit: 1000, page: 1 }),
        ]);

        // Handle task fetch result
        const taskResult = task.status === "fulfilled" ? task.value : null;
        if (!taskResult) {
          logError(
            "Failed to fetch task or task not found",
            {
              taskId: initialTaskId,
              error:
                task.status === "rejected" ? task.reason : "Task not found",
            },
            "useChatSession",
          );
          return;
        }

        // Handle messages fetch result
        const messagesResult =
          messages.status === "fulfilled" ? messages.value : [];
        if (messages.status === "rejected") {
          logError(
            "Failed to fetch messages",
            {
              taskId: initialTaskId,
              error: messages.reason,
            },
            "useChatSession",
          );
        }

        // Handle processed messages fetch result
        const processedMessagesResult =
          processedMessages.status === "fulfilled"
            ? processedMessages.value
            : [];
        if (processedMessages.status === "rejected") {
          logError(
            "Failed to fetch processed messages",
            {
              taskId: initialTaskId,
              error: processedMessages.reason,
            },
            "useChatSession",
          );
        }

        // Update state with fetched data
        logDebug(
          "Successfully loaded task data",
          {
            taskId: taskResult.id,
            status: taskResult.status,
            messageCount: messagesResult.length,
            processedMessageCount: processedMessagesResult.length,
          },
          "useChatSession",
        );

        setCurrentTaskId(taskResult.id);
        setTaskStatus(taskResult.status);
        setControl(taskResult.control);

        // Set grouped messages for chat UI
        if (Array.isArray(processedMessagesResult)) {
          setGroupedMessages(processedMessagesResult);
        }

        // If the task has messages, add them to the messages state for compatibility
        if (Array.isArray(messagesResult) && messagesResult.length > 0) {
          // Validate and process all messages
          const validMessages = messagesResult.filter((msg): msg is Message => {
            const isValid =
              msg &&
              typeof msg === "object" &&
              typeof msg.id === "string" &&
              msg.id.length > 0;
            if (!isValid) {
              logError(
                "Invalid message in initial load",
                { message: msg },
                "useChatSession",
              );
            }
            return isValid;
          });

          const formattedMessages: Message[] = validMessages.map(
            (msg: Message) => ({
              id: msg.id,
              content: msg.content,
              role: msg.role,
              createdAt: msg.createdAt,
              taskId: msg.taskId, // Preserve taskId
            }),
          );

          // Add message IDs to processed set
          formattedMessages.forEach((msg: Message) => {
            processedMessageIds.current.add(msg.id);
          });

          setMessages(formattedMessages);
          setCurrentPage(1);

          // If we got fewer messages than requested, we've reached the end
          setHasMoreMessages(messagesResult.length >= 10);
        } else {
          setCurrentPage(1);
          setHasMoreMessages(false);
        }
      } catch (error: unknown) {
        handleAsyncError("loading session", error, "loadSession");
      } finally {
        setIsLoadingSession(false);
      }
    };

    // Use void to explicitly handle the async call
    void loadSession();
  }, [initialTaskId]);

  /**
   * Join/leave WebSocket task rooms when task ID changes
   * Manages WebSocket subscriptions for real-time updates
   */
  useEffect(() => {
    if (isValidTaskId(currentTaskId)) {
      logDebug(
        "Joining WebSocket room for task",
        { taskId: currentTaskId },
        "useChatSession",
      );
      joinTask(currentTaskId);
    } else {
      logDebug(
        "Leaving WebSocket task room",
        { previousTaskId: currentTaskId },
        "useChatSession",
      );
      leaveTask();
    }

    // Cleanup function to leave task when component unmounts or task changes
    return () => {
      if (isValidTaskId(currentTaskId)) {
        logDebug(
          "Cleanup: leaving WebSocket room",
          { taskId: currentTaskId },
          "useChatSession",
        );
        leaveTask();
      }
    };
  }, [currentTaskId, joinTask, leaveTask]);

  /**
   * Handles adding a new message to the chat
   * Validates input, sends message, and handles errors gracefully
   */
  const handleAddMessage = useCallback(async (): Promise<void> => {
    const trimmedInput = input.trim();
    if (!trimmedInput) {
      logDebug(
        "Empty input provided to handleAddMessage",
        {},
        "useChatSession",
      );
      return;
    }

    if (!isValidTaskId(currentTaskId)) {
      logError(
        "No valid task ID for adding message",
        { currentTaskId },
        "useChatSession",
      );

      // Create error message for user feedback
      const errorMessage: Message = {
        id: `error_${Date.now()}_no_task`,
        content: [
          {
            type: MessageContentType._Text,
            text: "No active task found. Please start a new task first.",
          },
        ],
        role: Role.ASSISTANT,
        createdAt: new Date().toISOString(),
        taskId: currentTaskId || "",
      };

      processedMessageIds.current.add(errorMessage.id);
      setMessages((prev: Message[]) => [...prev, errorMessage]);
      return;
    }

    setIsLoading(true);
    const messageContent = trimmedInput;
    setInput(""); // Clear input immediately for better UX

    try {
      logDebug(
        "Adding message to task",
        {
          taskId: currentTaskId,
          messageLength: messageContent.length,
        },
        "useChatSession",
      );

      // Send request to start a new task or continue existing task
      const response = await addMessage(currentTaskId, messageContent);

      if (!response) {
        logError(
          "No response from addMessage",
          { taskId: currentTaskId },
          "useChatSession",
        );

        // Add error message to chat
        const errorMessage: Message = {
          id: `error_${Date.now()}_add_failed`,
          content: [
            {
              type: MessageContentType._Text,
              text: "Sorry, there was an error processing your request. Please try again.",
            },
          ],
          role: Role.ASSISTANT,
          createdAt: new Date().toISOString(),
          taskId: currentTaskId,
        };

        processedMessageIds.current.add(errorMessage.id);
        setMessages((prev: Message[]) => [...prev, errorMessage]);
      } else {
        logDebug(
          "Message added successfully",
          {
            taskId: currentTaskId,
            response: typeof response,
          },
          "useChatSession",
        );
      }
    } catch (error: unknown) {
      handleAsyncError("adding message", error, "handleAddMessage");

      // Add error message to chat for user feedback
      const errorMessage: Message = {
        id: `error_${Date.now()}_exception`,
        content: [
          {
            type: MessageContentType._Text,
            text: "An unexpected error occurred. Please try again.",
          },
        ],
        role: Role.ASSISTANT,
        createdAt: new Date().toISOString(),
        taskId: currentTaskId,
      };

      processedMessageIds.current.add(errorMessage.id);
      setMessages((prev: Message[]) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, currentTaskId]);

  /**
   * Handles taking over control of the current task
   * Updates control state based on the response
   */
  const handleTakeOverTask = useCallback(async (): Promise<void> => {
    if (!isValidTaskId(currentTaskId)) {
      logError(
        "No valid task ID for taking over task",
        { currentTaskId },
        "useChatSession",
      );
      return;
    }

    try {
      logDebug(
        "Taking over task control",
        { taskId: currentTaskId },
        "useChatSession",
      );
      const updatedTask = await takeOverTask(currentTaskId);

      if (
        updatedTask &&
        typeof updatedTask === "object" &&
        "control" in updatedTask
      ) {
        logDebug(
          "Successfully took over task",
          {
            taskId: currentTaskId,
            newControl: updatedTask.control,
          },
          "useChatSession",
        );
        setControl(updatedTask.control);

        // Update task status if provided
        if ("status" in updatedTask) {
          setTaskStatus(updatedTask.status);
        }
      } else {
        logError(
          "Invalid response from takeOverTask",
          {
            taskId: currentTaskId,
            response: updatedTask,
          },
          "useChatSession",
        );
      }
    } catch (error: unknown) {
      handleAsyncError("taking over task", error, "handleTakeOverTask");
    }
  }, [currentTaskId]);

  /**
   * Handles resuming a paused or stopped task
   * Updates control state based on the response
   */
  const handleResumeTask = useCallback(async (): Promise<void> => {
    if (!isValidTaskId(currentTaskId)) {
      logError(
        "No valid task ID for resuming task",
        { currentTaskId },
        "useChatSession",
      );
      return;
    }

    try {
      logDebug("Resuming task", { taskId: currentTaskId }, "useChatSession");
      const updatedTask = await resumeTask(currentTaskId);

      if (
        updatedTask &&
        typeof updatedTask === "object" &&
        "control" in updatedTask
      ) {
        logDebug(
          "Successfully resumed task",
          {
            taskId: currentTaskId,
            newControl: updatedTask.control,
          },
          "useChatSession",
        );
        setControl(updatedTask.control);

        // Update task status if provided
        if ("status" in updatedTask) {
          setTaskStatus(updatedTask.status);
        }
      } else {
        logError(
          "Invalid response from resumeTask",
          {
            taskId: currentTaskId,
            response: updatedTask,
          },
          "useChatSession",
        );
      }
    } catch (error: unknown) {
      handleAsyncError("resuming task", error, "handleResumeTask");
    }
  }, [currentTaskId]);

  /**
   * Handles cancelling the current task
   * Updates both status and control state based on the response
   */
  const handleCancelTask = useCallback(async (): Promise<void> => {
    if (!isValidTaskId(currentTaskId)) {
      logError(
        "No valid task ID for cancelling task",
        { currentTaskId },
        "useChatSession",
      );
      return;
    }

    try {
      logDebug("Cancelling task", { taskId: currentTaskId }, "useChatSession");
      const updatedTask = await cancelTask(currentTaskId);

      if (updatedTask && typeof updatedTask === "object") {
        logDebug(
          "Successfully cancelled task",
          {
            taskId: currentTaskId,
            newStatus: "status" in updatedTask ? updatedTask.status : "unknown",
            newControl:
              "control" in updatedTask ? updatedTask.control : "unknown",
          },
          "useChatSession",
        );

        if ("status" in updatedTask) {
          setTaskStatus(updatedTask.status);
        }
        if ("control" in updatedTask) {
          setControl(updatedTask.control);
        }
      } else {
        logError(
          "Invalid response from cancelTask",
          {
            taskId: currentTaskId,
            response: updatedTask,
          },
          "useChatSession",
        );
      }
    } catch (error: unknown) {
      handleAsyncError("cancelling task", error, "handleCancelTask");
    }
  }, [currentTaskId]);

  // Return all state and handlers for the chat session
  return {
    // State
    messages,
    groupedMessages,
    taskStatus,
    control,
    input,
    currentTaskId,
    isLoading,
    isLoadingSession,
    isLoadingMoreMessages,
    hasMoreMessages,

    // Handlers
    setInput,
    loadMoreMessages,
    handleAddMessage,
    handleTakeOverTask,
    handleResumeTask,
    handleCancelTask,
  } as const;
}
