import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Application,
  ComputerToolUseContentBlock,
  Coordinates,
  isApplicationToolUseBlock,
  isPasteTextToolUseBlock,
  isPressKeysToolUseBlock,
  isReadFileToolUseBlock,
  isScrollToolUseBlock,
  isTypeKeysToolUseBlock,
  isTypeTextToolUseBlock,
  isWaitToolUseBlock,
} from "@bytebot/shared";
import { getIcon, getLabel } from "./ComputerToolUtils";

/**
 * Type guard to safely check if a value has coordinates property
 */
function hasCoordinates(input: unknown): input is { coordinates: Coordinates } {
  if (typeof input !== "object" || input === null) {
    return false;
  }

  const obj = input as Record<string, unknown>;
  if (
    !("coordinates" in obj) ||
    typeof obj.coordinates !== "object" ||
    obj.coordinates === null
  ) {
    return false;
  }

  const coords = obj.coordinates as Record<string, unknown>;
  return (
    "x" in coords &&
    "y" in coords &&
    typeof coords.x === "number" &&
    typeof coords.y === "number"
  );
}

/**
 * Type guard to safely check if a value has a path property with coordinates array
 */
function hasPathCoordinates(input: unknown): input is { path: Coordinates[] } {
  if (typeof input !== "object" || input === null) {
    return false;
  }

  const obj = input as Record<string, unknown>;
  if (!("path" in obj) || !Array.isArray(obj.path) || obj.path.length === 0) {
    return false;
  }

  return obj.path.every((point: unknown): point is Coordinates => {
    if (typeof point !== "object" || point === null) {
      return false;
    }
    const coords = point as Record<string, unknown>;
    return (
      "x" in coords &&
      "y" in coords &&
      typeof coords.x === "number" &&
      typeof coords.y === "number"
    );
  });
}

/**
 * Type guard to safely check if a value is a valid Application type
 */
function isValidApplication(value: unknown): value is Application {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(applicationMap, value)
  );
}

/**
 * Safe wrapper for type guard calls that handles error types
 */
function safeTypeGuardCall(
  typeGuard: (block: unknown) => boolean,
  block: ComputerToolUseContentBlock,
): boolean {
  try {
    return Boolean(typeGuard(block));
  } catch {
    return false;
  }
}

/**
 * Type guard to check if a block is a valid ComputerToolUseContentBlock with input
 */
function isBlockWithInput(
  block: unknown,
): block is ComputerToolUseContentBlock & { input: Record<string, unknown> } {
  try {
    return Boolean(
      block !== null &&
        typeof block === "object" &&
        "input" in block &&
        block.input !== null &&
        typeof block.input === "object",
    );
  } catch {
    return false;
  }
}

interface ComputerToolContentNormalProps {
  block: ComputerToolUseContentBlock;
}

const applicationMap: Record<Application, string> = {
  firefox: "Firefox",
  "1password": "1Password",
  thunderbird: "Thunderbird",
  vscode: "Visual Studio Code",
  terminal: "Terminal",
  directory: "File Manager",
  desktop: "Desktop",
};

function ToolDetailsNormal({
  block,
}: {
  block: ComputerToolUseContentBlock;
}): React.JSX.Element {
  // Block is already properly typed from props
  const baseClasses =
    "px-1 py-0.5 text-[12px] text-bytebot-bronze-light-11 bg-bytebot-red-light-1 border border-bytebot-bronze-light-7 rounded-md";

  return (
    <>
      {safeTypeGuardCall(isApplicationToolUseBlock, block as unknown) && (
        <p className={baseClasses}>
          {((): string => {
            if (!isBlockWithInput(block)) {
              return "Unknown Application";
            }
            // Type assertion after type guard to fix unsafe member access
            const validatedBlock = block as ComputerToolUseContentBlock;
            const input = validatedBlock.input as { application?: unknown };
            const app = input.application;
            if (isValidApplication(app)) {
              // TypeScript should know app is Application here, but explicit cast for safety
              return applicationMap[app];
            }
            return "Unknown Application";
          })()}
        </p>
      )}

      {/* Text for type and key actions */}
      {(safeTypeGuardCall(isTypeKeysToolUseBlock, block as unknown) ||
        safeTypeGuardCall(isPressKeysToolUseBlock, block as unknown)) && (
        <p className={baseClasses}>
          {((): string => {
            if (!isBlockWithInput(block)) {
              return "Invalid keys";
            }
            // Type assertion after type guard to fix unsafe member access
            const validatedBlock = block as ComputerToolUseContentBlock;
            const input = validatedBlock.input as { keys?: unknown };
            const keys = input.keys;
            return Array.isArray(keys) ? keys.join(" + ") : "Invalid keys";
          })()}
        </p>
      )}

      {(safeTypeGuardCall(isTypeTextToolUseBlock, block as unknown) ||
        safeTypeGuardCall(isPasteTextToolUseBlock, block as unknown)) && (
        <p className={baseClasses}>
          {((): string => {
            if (!isBlockWithInput(block)) {
              return "Invalid text";
            }
            // Type assertion after type guard to fix unsafe member access
            const validatedBlock = block as ComputerToolUseContentBlock;
            const input = validatedBlock.input as { text?: unknown; isSensitive?: unknown };
            const text = input.text;
            const isSensitive = Boolean(input.isSensitive ?? false);

            if (typeof text !== "string") {
              return "Invalid text";
            }

            return isSensitive ? "●".repeat(text.length) : text;
          })()}
        </p>
      )}

      {/* Duration for wait actions */}
      {safeTypeGuardCall(isWaitToolUseBlock, block) && (
        <p className={baseClasses}>
          {((): string => {
            if (!isBlockWithInput(block)) {
              return "Invalid duration";
            }
            // After type guard, we know block has input property
            const input = (block as ComputerToolUseContentBlock).input as { duration?: unknown };
            const duration = input.duration;
            return typeof duration === "number"
              ? `${duration}ms`
              : "Invalid duration";
          })()}
        </p>
      )}

      {/* Coordinates for click/mouse actions */}
      {Boolean(block?.input) && hasCoordinates(block.input) && (
        <p className={baseClasses}>
          {((): string => {
            // hasCoordinates type guard already confirmed structure
            const coords = block.input.coordinates;
            return `${coords.x}, ${coords.y}`;
          })()}
        </p>
      )}

      {/* Start and end coordinates for path actions */}
      {Boolean(block?.input) && hasPathCoordinates(block.input) && (
        <p className={baseClasses}>
          {((): string => {
            // hasPathCoordinates type guard already confirmed structure  
            const path = block.input.path;
            const firstPoint = path[0];
            const lastPoint = path[path.length - 1];

            if (firstPoint === undefined || lastPoint === undefined) {
              return "Invalid path coordinates";
            }

            return `From: ${firstPoint.x}, ${firstPoint.y} → To: ${lastPoint.x}, ${lastPoint.y}`;
          })()}
        </p>
      )}

      {/* Scroll information */}
      {safeTypeGuardCall(isScrollToolUseBlock, block) && (
        <p className={baseClasses}>
          {((): string => {
            if (!isBlockWithInput(block)) {
              return "unknown 0";
            }
            // After type guard, we know block has input property
            const input = block.input;
            const direction = input.direction;
            const scrollCount = input.scrollCount;

            const validDirection =
              typeof direction === "string" ? direction : "unknown";
            const validScrollCount =
              typeof scrollCount === "number" && !Number.isNaN(scrollCount)
                ? scrollCount
                : 0;

            return `${validDirection} ${validScrollCount}`;
          })()}
        </p>
      )}

      {/* File information */}
      {safeTypeGuardCall(isReadFileToolUseBlock, block) && (
        <p className={baseClasses}>
          {((): string => {
            if (!isBlockWithInput(block)) {
              return "Invalid file path";
            }
            // After type guard, we know block has input property
            const input = block.input;
            const path = input.path;
            return typeof path === "string" ? path : "Invalid file path";
          })()}
        </p>
      )}
    </>
  );
}

export function ComputerToolContentNormal({
  block,
}: ComputerToolContentNormalProps): React.JSX.Element | null {
  // Don't render screenshot tool use blocks here - they're handled separately
  if (typeof block !== "object" || block === null) {
    return null;
  }

  const label = getLabel(block);
  if (label === "Screenshot") {
    return null;
  }

  const icon = getIcon(block);

  return (
    <div className="mb-3 max-w-4/5">
      <div className="flex items-center gap-2">
        <HugeiconsIcon
          icon={icon}
          className="text-bytebot-bronze-dark-9 h-4 w-4"
        />
        <p className="text-bytebot-bronze-light-11 text-xs">{label}</p>
        <ToolDetailsNormal block={block} />
      </div>
    </div>
  );
}
