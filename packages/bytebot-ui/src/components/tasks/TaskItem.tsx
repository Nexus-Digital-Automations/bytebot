import React from "react";
import { Task, TaskStatus } from "@/types";
import { format } from "date-fns";
import { capitalizeFirstChar } from "@/utils/stringUtils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  CancelCircleIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { Loader } from "@/components/ui/loader";
import Link from "next/link";

interface TaskItemProps {
  task: Task;
}

/**
 * Configuration interface for task status icons with strict TypeScript typing
 * Supports both HugeIcons components and loader states
 */
interface StatusIconConfig {
  /** HugeIcons icon component - must be compatible with HugeiconsIcon wrapper */
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
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
  const formatDate = (dateString: string) => {
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
    if (!config) {
      console.warn(`No icon configuration found for status: ${status}`);
      return null;
    }

    const { icon: IconComponent, color, useLoader } = config;

    // Show loader for pending/running states
    if (useLoader) {
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
    if (IconComponent) {
      return (
        <div
          className="flex items-center justify-center"
          role="img"
          aria-label={`Status: ${status.toLowerCase()}`}
        >
          <HugeiconsIcon
            icon={IconComponent}
            className={`h-5 w-5 ${color || "text-gray-500"}`}
          />
        </div>
      );
    }

    // Fallback for missing icon component
    console.warn(`Icon component not found for status: ${status}`);
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
                  {task.user.name || task.user.email}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};
