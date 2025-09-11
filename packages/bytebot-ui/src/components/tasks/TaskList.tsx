"use client";

import React, { useCallback, useEffect, useState } from "react";
import { TaskItem } from "@/components/tasks/TaskItem";
import { fetchTasks } from "@/utils/taskUtils";
import { Task } from "@/types";
import { useWebSocket } from "@/hooks/useWebSocket";

interface TaskListProps {
  limit?: number;
  className?: string;
  title?: string;
  description?: string;
  showHeader?: boolean;
}

export const TaskList: React.FC<TaskListProps> = ({
  limit = 5,
  className = "",
  title = "Latest Tasks",
  description,
  showHeader = true,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // WebSocket handlers for real-time updates
  const handleTaskUpdate = useCallback((updatedTask: Task) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === updatedTask.id ? updatedTask : task)),
    );
  }, []);

  const handleTaskCreated = useCallback(
    (newTask: Task) => {
      setTasks((prev) => {
        const updated = [newTask, ...prev];
        return updated.slice(0, limit);
      });
    },
    [limit],
  );

  const handleTaskDeleted = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  }, []);

  // Initialize WebSocket for task list updates
  useWebSocket({
    onTaskUpdate: handleTaskUpdate,
    onTaskCreated: handleTaskCreated,
    onTaskDeleted: handleTaskDeleted,
  });

  useEffect(() => {
    const loadTasks = async (): Promise<void> => {
      setIsLoading(true);
      try {
        const result = await fetchTasks({ limit });
        setTasks(result.tasks);
      } catch (_error) {
        // TODO: Add proper error logging service
        // console.error("Failed to load tasks:", _error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTasks().catch((error: unknown) => {
      console.error("Failed to load tasks:", error);
    });
  }, [limit]);

  return (
    <div className={className}>
      {showHeader && (
        <div className="mb-6 flex flex-col gap-1">
          <h2 className="text-base font-medium">{title}</h2>
          <p className="text-bytebot-bronze-light-11 text-sm">{description}</p>
        </div>
      )}

      {((): React.JSX.Element => {
        if (isLoading) {
          return (
            <div className="p-4 text-center">
              <div className="border-bytebot-bronze-light-5 border-t-bytebot-bronze mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-4"></div>
              <p className="text-sm text-gray-500">Loading tasks...</p>
            </div>
          );
        }

        if (tasks.length === 0) {
          return (
            <div className="border-bytebot-bronze-light-5 rounded-lg border border-dashed p-4 text-center">
              <p className="text-sm text-gray-500">No tasks available</p>
              <p className="mt-1 text-xs text-gray-400">
                Your completed tasks will appear here
              </p>
            </div>
          );
        }

        return (
          <div className="space-y-3">
            {tasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        );
      })()}
    </div>
  );
};
