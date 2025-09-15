import * as React from "react";
import { Task, TaskStatus } from "../../types";
import { format } from "date-fns";
import { capitalizeFirstChar } from "../../utils/stringUtils";
// Simple SVG icon definitions - removes external dependency issues
const AlertCircleIcon = (): React.ReactElement => (
  <svg
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const CancelCircleIcon = (): React.ReactElement => (
  <svg
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const Tick02Icon = (): React.ReactElement => (
  <svg
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <polyline points="20,6 9,17 4,12" />
  </svg>
);
import { Loader } from "../ui/loader";
import Link from "next/link";
import { logError } from "../../utils/logger";

/**
 * Type definition for simple SVG icon components
 */
type IconComponent = () => React.ReactElement;

interface TaskItemProps {
  task: Task;
}

/**
 * Configuration interface for task status icons with strict TypeScript typing
 * Supports both icon components and loader states
 */
interface StatusIconConfig {
  /** Icon component for task status */
  icon?: IconComponent;
  /** Tailwind CSS color class for the icon */
  color?: string;
  /** Whether to show a loading spinner instead of an icon */
  useLoader?: boolean;
}

/**
 * Type-safe status icon configuration mapping
 * Ensures all TaskStatus enum values have corresponding icon configurations
 */

const STATUS_CONFIGS: Record<TaskStatus, StatusIconConfig> = {
  [TaskStatus.COMPLETED]: {
    icon: Tick02Icon,
    color: "text-bytebot-green-8",
  },
  [TaskStatus.RUNNING]: {
    useLoader: true,
  },
  [TaskStatus.NEEDS_HELP]: {
    icon: AlertCircleIcon,
    color: "text-[#FF9D00]",
  },
  [TaskStatus.PENDING]: {
    useLoader: true,
  },
  [TaskStatus.FAILED]: {
    icon: AlertCircleIcon,
    color: "text-bytebot-red-light-9",
  },
  [TaskStatus.NEEDS_REVIEW]: {
    icon: AlertCircleIcon,
    color: "text-[#FF9D00]",
  },
  [TaskStatus.CANCELLED]: {
    icon: CancelCircleIcon,
    color: "text-bytebot-bronze-light-10",
  },
};

/**
 * TaskItem component with performance optimization via React.memo
 * Only re-renders when task data actually changes
 */
const TaskItemComponent: React.FC<TaskItemProps> = ({ task }) => {
  // Format date to match the screenshot (e.g., "Today 9:13am" or "April 13, 2025, 12:01pm")
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();

    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    const formatString = isToday ? `'Today' h:mma` : "MMMM d, yyyy h:mma";

    const formatted = format(date, formatString).toLowerCase();
    return capitalizeFirstChar(formatted);
  };

  /**
   * Status icon component with comprehensive error handling and type safety
   * @param status - TaskStatus enum value
   * @returns React component displaying appropriate icon or loader
   */
  const StatusIcon: React.FC<{ status: TaskStatus }> = ({ status }) => {
    const config = STATUS_CONFIGS[status];

    // Defensive programming - handle missing config gracefully
    if (config === null) {
      // Development warning for missing config
      if (process.env.NODE_ENV === "development") {
        logError(
          `No icon configuration found for status: ${status}`,
          { status },
          "TaskItem",
        );
      }
      return null;
    }

    const { icon: IconComponent, color, useLoader } = config;

    // Show loader for pending/running states
    if (useLoader === true) {
      return (
        <div
          className="flex items-center justify-center"
          role="status"
          aria-label="Loading"
        >
          <Loader size={16} />
        </div>
      );
    }

    // Render icon with proper accessibility
    if (IconComponent !== undefined) {
      return (
        <div
          className="flex items-center justify-center"
          role="img"
          aria-label={`Status: ${status.toLowerCase()}`}
        >
          <div className={`h-5 w-5 ${color ?? "text-gray-500"}`}>
            <IconComponent />
          </div>
        </div>
      );
    }

    // Fallback for missing icon component
    if (process.env.NODE_ENV === "development") {
      logError(
        `Icon component not found for status: ${status}`,
        { status },
        "TaskItem",
      );
    }
    return null;
  };

  return (
    <Link href={`/tasks/${task.id}`} className="block">
      <div className="bg-bytebot-bronze-light-2 border-bytebot-bronze-light-7 hover:bg-bytebot-bronze-light-3 flex min-h-24 items-start rounded-lg border p-5 transition-colors">
        <div className="mb-0.5 flex-1 space-y-2">
          <div className="flex items-center justify-start space-x-2">
            <StatusIcon status={task.status} />
            <div className="text-byhtebot-bronze-dark-7 text-sm font-medium">
              {capitalizeFirstChar(task.description)}
            </div>
          </div>
          <div className="ml-7 flex items-center justify-start space-x-1.5 text-xs">
            <span className="text-bytebot-bronze-light-10">
              {formatDate(task.createdAt)}
            </span>
            {task.user && (
              <>
                <span className="text-bytebot-bronze-light-10">•</span>
                <span className="text-bytebot-bronze-light-10">
                  {task.user.name ?? task.user.email}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

/**
 * Memoized TaskItem component for optimized performance
 * Only re-renders when task props change (deep comparison on task object)
 */
export const TaskItem = React.memo(
  TaskItemComponent,
  (prevProps, nextProps) => {
    // Custom comparison function for better performance control
    // Only re-render if task ID, status, description, or timestamp changes
    return (
      prevProps.task.id === nextProps.task.id &&
      prevProps.task.status === nextProps.task.status &&
      prevProps.task.description === nextProps.task.description &&
      prevProps.task.createdAt === nextProps.task.createdAt &&
      prevProps.task.updatedAt === nextProps.task.updatedAt &&
      prevProps.task.user?.id === nextProps.task.user?.id
    );
  },
);
