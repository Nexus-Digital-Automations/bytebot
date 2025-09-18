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
      {Boolean(isApplicationToolUseBlock(block)) && (
        <p className={baseClasses}>
          {((): string => {
            if (!isBlockWithInput(block)) {
              return "Unknown Application";
            }
            // After type guard, we know block has input property
            const input = (block as { input?: unknown })?.input;
            if (typeof input === "object" && input !== null && "application" in input) {
              const app = (input as { application?: unknown }).application;
              if (isValidApplication(app)) {
                return applicationMap[app];
              }
            }
            return "Unknown Application";
          })()}
        </p>
      )}

      {/* Text for type and key actions */}
      {(Boolean(isTypeKeysToolUseBlock(block)) || Boolean(isPressKeysToolUseBlock(block))) && (
        <p className={baseClasses}>
          {((): string => {
            if (!isBlockWithInput(block)) {
              return "Invalid keys";
            }
            // After type guard, we know block has input property
            const input = (block as { input?: unknown })?.input;
            if (typeof input === "object" && input !== null && "keys" in input) {
              const keys = (input as { keys?: unknown }).keys;
              return Array.isArray(keys) ? keys.join(" + ") : "Invalid keys";
            }
            return "Invalid keys";
          })()}
        </p>
      )}

      {(Boolean(isTypeTextToolUseBlock(block)) || Boolean(isPasteTextToolUseBlock(block))) && (
        <p className={baseClasses}>
          {((): string => {
            if (!isBlockWithInput(block)) {
              return "Invalid text";
            }
            // After type guard, we know block has input property
            const input = (block as { input?: unknown })?.input;
            if (typeof input === "object" && input !== null) {
              const inputObj = input as { text?: unknown; isSensitive?: unknown };
              const text = inputObj.text;
              const isSensitive = Boolean(inputObj.isSensitive ?? false);

              if (typeof text !== "string") {
                return "Invalid text";
              }

              return isSensitive ? "●".repeat(text.length) : text;
            }
            return "Invalid text";
          })()}
        </p>
      )}

      {/* Duration for wait actions */}
      {Boolean(isWaitToolUseBlock(block)) && (
        <p className={baseClasses}>
          {((): string => {
            if (!isBlockWithInput(block)) {
              return "Invalid duration";
            }
            // After type guard, we know block has input property
            const input = (block as { input?: unknown })?.input;
            if (typeof input === "object" && input !== null && "duration" in input) {
              const duration = (input as { duration?: unknown }).duration;
              return typeof duration === "number"
                ? `${duration}ms`
                : "Invalid duration";
            }
            return "Invalid duration";
          })()}
        </p>
      )}

      {/* Coordinates for click/mouse actions */}
      {Boolean((block as { input?: unknown })?.input) && hasCoordinates((block as { input?: unknown })?.input) && (
        <p className={baseClasses}>
          {((): string => {
            // hasCoordinates type guard already confirmed structure
            if (hasCoordinates((block as { input?: unknown })?.input)) {
              const coords = ((block as { input?: unknown })?.input as { coordinates: Coordinates }).coordinates;
              return `${coords.x}, ${coords.y}`;
            }
            return "Invalid coordinates";
          })()}
        </p>
      )}

      {/* Start and end coordinates for path actions */}
      {Boolean((block as { input?: unknown })?.input) && hasPathCoordinates((block as { input?: unknown })?.input) && (
        <p className={baseClasses}>
          {((): string => {
            // hasPathCoordinates type guard already confirmed structure  
            if (hasPathCoordinates((block as { input?: unknown })?.input)) {
              const path = ((block as { input?: unknown })?.input as { path: Coordinates[] }).path;
              const firstPoint = path[0];
              const lastPoint = path[path.length - 1];

              if (firstPoint === undefined || lastPoint === undefined) {
                return "Invalid path coordinates";
              }

              return `From: ${firstPoint.x}, ${firstPoint.y} → To: ${lastPoint.x}, ${lastPoint.y}`;
            }
            return "Invalid path coordinates";
          })()}
        </p>
      )}

      {/* Scroll information */}
      {isScrollToolUseBlock(block) && (
        <p className={baseClasses}>
          {((): string => {
            if (!isBlockWithInput(block)) {
              return "unknown 0";
            }
            // After type guard, we know block has input property
            const input = (block as { input?: unknown })?.input;
            if (typeof input === "object" && input !== null) {
              const inputObj = input as { direction?: unknown; scrollCount?: unknown };
              const direction = inputObj.direction;
              const scrollCount = inputObj.scrollCount;

              const validDirection =
                typeof direction === "string" ? direction : "unknown";
              const validScrollCount =
                typeof scrollCount === "number" && !Number.isNaN(scrollCount)
                  ? scrollCount
                  : 0;

              return `${validDirection} ${validScrollCount}`;
            }
            return "unknown 0";
          })()}
        </p>
      )}

      {/* File information */}
      {isReadFileToolUseBlock(block) && (
        <p className={baseClasses}>
          {((): string => {
            if (!isBlockWithInput(block)) {
              return "Invalid file path";
            }
            // After type guard, we know block has input property
            const input = (block as { input?: unknown })?.input;
            if (typeof input === "object" && input !== null && "path" in input) {
              const path = (input as { path?: unknown }).path;
              return typeof path === "string" ? path : "Invalid file path";
            }
            return "Invalid file path";
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
