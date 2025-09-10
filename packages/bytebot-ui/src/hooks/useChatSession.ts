import { useState, useEffect, useRef, useCallback } from "react";
import { Message, Role, TaskStatus, Task, GroupedMessages } from "@/types";
import {
  addMessage,
  fetchTaskMessages,
  fetchTaskProcessedMessages,
  fetchTaskById,
  takeOverTask,
  resumeTask,
  cancelTask,
} from "@/utils/taskUtils";
import { MessageContentType } from "@bytebot/shared";
import { useWebSocket } from "./useWebSocket";
import { logError, logDebug } from "@/utils/logger";

interface UseChatSessionProps {
  initialTaskId?: string;
}

export function useChatSession({ initialTaskId }: UseChatSessionProps = {}) {
  const [taskStatus, setTaskStatus] = useState<TaskStatus>(TaskStatus.PENDING);
  const [control, setControl] = useState<Role>(Role.ASSISTANT);
  const [messages, setMessages] = useState<Message[]>([]);
  const [groupedMessages, setGroupedMessages] = useState<GroupedMessages[]>([]);
  const [input, setInput] = useState("");
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(
    initialTaskId || null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  const processedMessageIds = useRef<Set<string>>(new Set());

  // WebSocket event handlers
  const handleTaskUpdate = useCallback(
    (task: Task) => {
      if (task.id === currentTaskId) {
        setTaskStatus(task.status);
        setControl(task.control);
      }
    },
    [currentTaskId],
  );

  // Function to reload grouped messages
  const reloadGroupedMessages = useCallback(async () => {
    if (!currentTaskId) return;

    try {
      const processedMessages = await fetchTaskProcessedMessages(
        currentTaskId,
        {
          limit: 1000, // Get more messages for grouped view
          page: 1,
        },
      );
      setGroupedMessages(processedMessages);
    } catch (_error) {
      logError("Error reloading grouped messages", error, "useChatSession");
    }
  }, [currentTaskId]);

  const handleNewMessage = useCallback(
    (message: Message) => {
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
        setMessages((prev) => [...prev, message]);
        // Reload grouped messages to reflect the new message
        reloadGroupedMessages();
      }
    },
    [currentTaskId, reloadGroupedMessages],
  );

  const handleTaskCreated = useCallback((task: Task) => {
    logDebug(
      "New task created",
      { taskId: task.id, title: task.title },
      "useChatSession",
    );
  }, []);

  const handleTaskDeleted = useCallback(
    (taskId: string) => {
      if (taskId === currentTaskId) {
        logDebug("Current task was deleted", { taskId }, "useChatSession");
        setCurrentTaskId(null);
        setMessages([]);
        processedMessageIds.current = new Set();
      }
    },
    [currentTaskId],
  );

  // Initialize WebSocket connection
  const { joinTask, leaveTask } = useWebSocket({
    onTaskUpdate: handleTaskUpdate,
    onNewMessage: handleNewMessage,
    onTaskCreated: handleTaskCreated,
    onTaskDeleted: handleTaskDeleted,
  });

  // Load more messages function for infinite scroll
  const loadMoreMessages = useCallback(async () => {
    if (!currentTaskId || isLoadingMoreMessages || !hasMoreMessages) {
      // TODO: Add proper debug logging service
      // console.log("loadMoreMessages early return");
      return;
    }

    setIsLoadingMoreMessages(true);
    try {
      const nextPage = currentPage + 1;
      const newMessages = await fetchTaskMessages(currentTaskId, {
        limit: 10,
        page: nextPage,
      });

      if (newMessages.length === 0) {
        setHasMoreMessages(false);
      } else {
        // Append new messages to the end of the list (newer messages)
        const formattedMessages = newMessages.map((msg: Message) => ({
          id: msg.id,
          content: msg.content,
          role: msg.role,
          createdAt: msg.createdAt,
        }));

        // Filter out any messages we already have
        const uniqueMessages = formattedMessages.filter(
          (msg) => !processedMessageIds.current.has(msg.id),
        );

        if (uniqueMessages.length > 0) {
          // Add message IDs to processed set
          uniqueMessages.forEach((msg: Message) => {
            processedMessageIds.current.add(msg.id);
          });

          setMessages((prev) => [...prev, ...uniqueMessages]);
          setCurrentPage(nextPage);
        }

        // If we got fewer messages than requested, we've reached the end
        if (newMessages.length < 10) {
          setHasMoreMessages(false);
        }
      }
    } catch (_error) {
      // TODO: Add proper error logging service
      // console.error("Error loading more messages:", _error);
    } finally {
      setIsLoadingMoreMessages(false);
    }
  }, [currentTaskId, currentPage, isLoadingMoreMessages, hasMoreMessages]);

  // Load task ID from URL parameter or fetch the latest task on initial render
  useEffect(() => {
    const loadSession = async () => {
      setIsLoadingSession(true);
      try {
        if (initialTaskId) {
          // If we have an initial task ID (from URL), fetch that specific task
          // TODO: Add proper debug logging service
          // console.log(`Fetching specific task: ${initialTaskId}`);
          const task = await fetchTaskById(initialTaskId);
          // Load raw messages for compatibility and processed messages for chat UI
          const messages = await fetchTaskMessages(initialTaskId, {
            limit: 10,
            page: 1,
          });
          const processedMessages = await fetchTaskProcessedMessages(
            initialTaskId,
            {
              limit: 1000, // Get more messages for grouped view
              page: 1,
            },
          );

          if (task) {
            // TODO: Add proper debug logging service
            // console.log(`Found task: ${task.id}`);
            setCurrentTaskId(task.id);
            setTaskStatus(task.status); // Set the task status when loading
            setControl(task.control);

            // Set grouped messages for chat UI
            setGroupedMessages(processedMessages);

            // If the task has messages, add them to the messages state for compatibility
            if (messages && messages.length > 0) {
              // Process all messages
              const formattedMessages = messages.map((msg: Message) => ({
                id: msg.id,
                content: msg.content,
                role: msg.role,
                createdAt: msg.createdAt,
              }));

              // Add message IDs to processed set
              formattedMessages.forEach((msg: Message) => {
                processedMessageIds.current.add(msg.id);
              });

              setMessages(formattedMessages);
              setCurrentPage(1);

              // If we got fewer messages than requested, we've reached the end
              if (messages.length < 10) {
                setHasMoreMessages(false);
              } else {
                setHasMoreMessages(true);
              }
            } else {
              setCurrentPage(1);
              setHasMoreMessages(false);
            }
          } else {
            // TODO: Add proper debug logging service
            // console.log(`Task with ID ${initialTaskId} not found`);
          }
        }
      } catch (_error) {
        // TODO: Add proper error logging service
        // console.error("Error loading session:", _error);
      } finally {
        setIsLoadingSession(false);
      }
    };

    loadSession();
  }, [initialTaskId]);

  // Join/leave WebSocket task rooms when task ID changes
  useEffect(() => {
    if (currentTaskId) {
      // TODO: Add proper debug logging service
      // console.log(`Joining WebSocket room for task: ${currentTaskId}`);
      joinTask(currentTaskId);
    } else {
      // TODO: Add proper debug logging service
      // console.log("Leaving WebSocket task room");
      leaveTask();
    }
  }, [currentTaskId, joinTask, leaveTask]);

  const handleAddMessage = async () => {
    if (!input.trim()) return;

    setIsLoading(true);

    try {
      const message = input;
      setInput("");

      // Send request to start a new task or continue existing task
      const response = await addMessage(currentTaskId!, message);

      if (!response) {
        // Add error message to chat
        const errorMessage: Message = {
          id: Date.now().toString(),
          content: [
            {
              type: MessageContentType._Text,
              text: "Sorry, there was an error processing your request. Please try again.",
            },
          ],
          role: Role.ASSISTANT,
          createdAt: new Date().toISOString(),
        };

        processedMessageIds.current.add(errorMessage.id);
        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTakeOverTask = async () => {
    if (!currentTaskId) return;

    try {
      const updatedTask = await takeOverTask(currentTaskId);
      if (updatedTask) {
        setControl(updatedTask.control);
      }
    } catch (_error) {
      // TODO: Add proper error logging service
      // console.error("Error taking over task:", _error);
    }
  };

  const handleResumeTask = async () => {
    if (!currentTaskId) return;

    try {
      const updatedTask = await resumeTask(currentTaskId);
      if (updatedTask) {
        setControl(updatedTask.control);
      }
    } catch (_error) {
      // TODO: Add proper error logging service
      // console.error("Error resuming task:", _error);
    }
  };

  const handleCancelTask = async () => {
    if (!currentTaskId) return;

    try {
      const updatedTask = await cancelTask(currentTaskId);
      if (updatedTask) {
        setTaskStatus(updatedTask.status);
        setControl(updatedTask.control);
      }
    } catch (_error) {
      // TODO: Add proper error logging service
      // console.error("Error cancelling task:", _error);
    }
  };

  return {
    messages,
    groupedMessages,
    taskStatus,
    control,
    input,
    setInput,
    currentTaskId,
    isLoading,
    isLoadingSession,
    isLoadingMoreMessages,
    hasMoreMessages,
    loadMoreMessages,
    handleAddMessage,
    handleTakeOverTask,
    handleResumeTask,
    handleCancelTask,
  };
}
