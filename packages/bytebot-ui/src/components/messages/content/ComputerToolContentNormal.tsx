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
  const baseClasses =
    "px-1 py-0.5 text-[12px] text-bytebot-bronze-light-11 bg-bytebot-red-light-1 border border-bytebot-bronze-light-7 rounded-md";

  return (
    <>
      {isApplicationToolUseBlock(block) && (
        <p className={baseClasses}>
          {((): string => {
            const app = block.input.application;
            return isValidApplication(app)
              ? applicationMap[app]
              : "Unknown Application";
          })()}
        </p>
      )}

      {/* Text for type and key actions */}
      {(isTypeKeysToolUseBlock(block) || isPressKeysToolUseBlock(block)) && (
        <p className={baseClasses}>
          {((): string => {
            const keys = block.input.keys;
            return Array.isArray(keys)
              ? String(keys.join(" + "))
              : "Invalid keys";
          })()}
        </p>
      )}

      {(isTypeTextToolUseBlock(block) || isPasteTextToolUseBlock(block)) && (
        <p className={baseClasses}>
          {((): string => {
            const input = block.input;
            const text = input.text;
            const isSensitive = Boolean(input.isSensitive);

            if (typeof text !== "string") {
              return "Invalid text";
            }

            return String(isSensitive ? "●".repeat(text.length) : text);
          })()}
        </p>
      )}

      {/* Duration for wait actions */}
      {isWaitToolUseBlock(block) && (
        <p className={baseClasses}>
          {((): string => {
            const duration = block.input.duration;
            return typeof duration === "number"
              ? `${duration}ms`
              : "Invalid duration";
          })()}
        </p>
      )}

      {/* Coordinates for click/mouse actions */}
      {hasCoordinates(block.input) && (
        <p className={baseClasses}>
          {block.input.coordinates.x}, {block.input.coordinates.y}
        </p>
      )}

      {/* Start and end coordinates for path actions */}
      {hasPathCoordinates(block.input) && (
        <p className={baseClasses}>
          {((): string => {
            const path = block.input.path;
            const firstPoint = path[0];
            const lastPoint = path[path.length - 1];

            if (!firstPoint || !lastPoint) {
              return "Invalid path coordinates";
            }

            return `From: ${firstPoint.x}, ${firstPoint.y} → To: ${lastPoint.x}, ${lastPoint.y}`;
          })()}
        </p>
      )}

      {/* Scroll information */}
      {isScrollToolUseBlock(block) && (
        <p className={baseClasses}>
          {((): string => {
            const input = block.input;
            const direction = input.direction;
            const scrollCount = input.scrollCount;

            const validDirection =
              typeof direction === "string" ? direction : "unknown";
            const validScrollCount =
              typeof scrollCount === "number" && !isNaN(scrollCount)
                ? scrollCount
                : 0;

            return `${validDirection} ${validScrollCount}`;
          })()}
        </p>
      )}

      {/* File information */}
      {isReadFileToolUseBlock(block) && (
        <p className={baseClasses}>
          {((): string => {
            const path = block.input.path;
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
