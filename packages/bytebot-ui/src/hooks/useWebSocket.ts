import { useCallback, useEffect, useRef } from "react";
import { Socket, io } from "socket.io-client";
import { Message, Task } from "@/types";
import { logDebug, logInfo } from "@/utils/logger";

interface UseWebSocketProps {
  onTaskUpdate?: (task: Task) => void;
  onNewMessage?: (message: Message) => void;
  onTaskCreated?: (task: Task) => void;
  onTaskDeleted?: (taskId: string) => void;
}

export function useWebSocket({
  onTaskUpdate,
  onNewMessage,
  onTaskCreated,
  onTaskDeleted,
}: UseWebSocketProps = {}) {
  const socketRef = useRef<Socket | null>(null);
  const currentTaskIdRef = useRef<string | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return socketRef.current;
    }

    // Connect to the WebSocket server
    const socket = io({
      path: "/api/proxy/tasks",
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      logInfo("Connected to WebSocket server", null, "useWebSocket");
    });

    socket.on("disconnect", () => {
      logInfo("Disconnected from WebSocket server", null, "useWebSocket");
    });

    socket.on("task_updated", (task: Task) => {
      logDebug(
        "Task updated",
        { taskId: task.id, status: task.status },
        "useWebSocket",
      );
      onTaskUpdate?.(task);
    });

    socket.on("new_message", (message: Message) => {
      logDebug(
        "New message received",
        { messageId: message.id, taskId: message.taskId },
        "useWebSocket",
      );
      onNewMessage?.(message);
    });

    socket.on("task_created", (task: Task) => {
      logDebug(
        "Task created",
        { taskId: task.id, title: task.title },
        "useWebSocket",
      );
      onTaskCreated?.(task);
    });

    socket.on("task_deleted", (taskId: string) => {
      logDebug("Task deleted", { taskId }, "useWebSocket");
      onTaskDeleted?.(taskId);
    });

    socketRef.current = socket;
    return socket;
  }, [onTaskUpdate, onNewMessage, onTaskCreated, onTaskDeleted]);

  const joinTask = useCallback(
    (taskId: string) => {
      const socket = socketRef.current || connect();
      if (currentTaskIdRef.current) {
        socket.emit("leave_task", currentTaskIdRef.current);
      }
      socket.emit("join_task", taskId);
      currentTaskIdRef.current = taskId;
      logDebug("Joined task room", { taskId }, "useWebSocket");
    },
    [connect],
  );

  const leaveTask = useCallback(() => {
    const socket = socketRef.current;
    if (socket && currentTaskIdRef.current) {
      socket.emit("leave_task", currentTaskIdRef.current);
      // TODO: Add proper debug logging service
      // console.log(`Left task room: ${currentTaskIdRef.current}`);
      currentTaskIdRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      currentTaskIdRef.current = null;
    }
  }, []);

  // Initialize connection on mount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    socket: socketRef.current,
    joinTask,
    leaveTask,
    disconnect,
    isConnected: socketRef.current?.connected || false,
  };
}
