import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
}

const PROGRESS_CONSTANTS = {
  DEFAULT_MAX: 100,
  PERCENTAGE_MULTIPLIER: 100,
  MIN_PERCENTAGE: 0,
  MAX_PERCENTAGE: 100,
} as const;

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = PROGRESS_CONSTANTS.DEFAULT_MAX, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * PROGRESS_CONSTANTS.PERCENTAGE_MULTIPLIER, PROGRESS_CONSTANTS.MIN_PERCENTAGE), PROGRESS_CONSTANTS.MAX_PERCENTAGE);
    
    return (
      <div
        ref={ref}
        className={cn(
          "relative h-4 w-full overflow-hidden rounded-full bg-gray-200",
          className
        )}
        {...props}
      >
        <div
          className="h-full bg-blue-500 transition-all duration-300 ease-in-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress };