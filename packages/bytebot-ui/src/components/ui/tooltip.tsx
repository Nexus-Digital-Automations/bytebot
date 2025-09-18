import * as React from "react";
import { cn } from "@/lib/utils";

const TOOLTIP_CONSTANTS = {
  DEFAULT_SIDE_OFFSET: 4,
} as const;

interface TooltipProviderProps {
  children: React.ReactNode;
}

interface TooltipProps {
  children: React.ReactNode;
}

interface TooltipTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
}

const TooltipProvider: React.FC<TooltipProviderProps> = ({ children }) => {
  return <>{children}</>;
};

const Tooltip: React.FC<TooltipProps> = ({ children }) => {
  const [isVisible, setIsVisible] = React.useState(false);
  
  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => { setIsVisible(true); }}
      onMouseLeave={() => { setIsVisible(false); }}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { isVisible } as Partial<unknown>);
        }
        return child;
      })}
    </div>
  );
};

const TooltipTrigger: React.FC<TooltipTriggerProps> = ({ children }) => {
  return <>{children}</>;
};

const TooltipContent: React.FC<TooltipContentProps & { isVisible?: boolean }> = ({
  children,
  className,
  side = "top",
  sideOffset = TOOLTIP_CONSTANTS.DEFAULT_SIDE_OFFSET,
  isVisible = false,
  ...props
}) => {
  if (!isVisible) {return null;}

  const sideClasses = {
    top: "bottom-full left-1/2 transform -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 transform -translate-x-1/2 mt-2",
    left: "right-full top-1/2 transform -translate-y-1/2 mr-2",
    right: "left-full top-1/2 transform -translate-y-1/2 ml-2",
  };

  return (
    <div
      className={cn(
        "absolute z-50 px-3 py-1.5 text-sm text-white bg-gray-900 rounded-md shadow-lg",
        "animate-in fade-in-0 zoom-in-95",
        sideClasses[side],
        className
      )}
      style={{ marginTop: side === "top" ? -sideOffset : undefined }}
      {...props}
    >
      {children}
      <div
        className={cn(
          "absolute w-2 h-2 bg-gray-900 transform rotate-45",
          side === "top" && "top-full left-1/2 -translate-x-1/2 -mt-1",
          side === "bottom" && "bottom-full left-1/2 -translate-x-1/2 -mb-1",
          side === "left" && "left-full top-1/2 -translate-y-1/2 -ml-1",
          side === "right" && "right-full top-1/2 -translate-y-1/2 -mr-1"
        )}
      />
    </div>
  );
};

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };