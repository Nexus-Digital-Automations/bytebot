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
  return (
    typeof input === "object" &&
    input !== null &&
    "coordinates" in input &&
    typeof (input as { coordinates: unknown }).coordinates === "object" &&
    (input as { coordinates: unknown }).coordinates !== null &&
    "x" in (input as { coordinates: Coordinates }).coordinates &&
    "y" in (input as { coordinates: Coordinates }).coordinates &&
    typeof (input as { coordinates: Coordinates }).coordinates.x === "number" &&
    typeof (input as { coordinates: Coordinates }).coordinates.y === "number"
  );
}

/**
 * Type guard to safely check if a value has a path property with coordinates array
 */
function hasPathCoordinates(input: unknown): input is { path: Coordinates[] } {
  return (
    typeof input === "object" &&
    input !== null &&
    "path" in input &&
    Array.isArray((input as { path: unknown }).path) &&
    (input as { path: unknown[] }).path.length > 0 &&
    (input as { path: unknown[] }).path.every(
      (point: unknown): point is Coordinates =>
        typeof point === "object" &&
        point !== null &&
        "x" in point &&
        "y" in point &&
        typeof (point as Coordinates).x === "number" &&
        typeof (point as Coordinates).y === "number",
    )
  );
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
          {isValidApplication(block.input.application)
            ? applicationMap[block.input.application]
            : "Unknown Application"}
        </p>
      )}

      {/* Text for type and key actions */}
      {(isTypeKeysToolUseBlock(block) || isPressKeysToolUseBlock(block)) && (
        <p className={baseClasses}>
          {Array.isArray(block.input.keys)
            ? String(block.input.keys.join(" + "))
            : "Invalid keys"}
        </p>
      )}

      {(isTypeTextToolUseBlock(block) || isPasteTextToolUseBlock(block)) && (
        <p className={baseClasses}>
          {((): string => {
            const text = block.input.text;
            const isSensitive = Boolean(block.input.isSensitive);

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
          {typeof block.input.duration === "number"
            ? `${block.input.duration}ms`
            : "Invalid duration"}
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
            const direction = block.input.direction;
            const scrollCount = block.input.scrollCount;

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
          {typeof block.input.path === "string"
            ? block.input.path
            : "Invalid file path"}
        </p>
      )}
    </>
  );
}

export function ComputerToolContentNormal({
  block,
}: ComputerToolContentNormalProps): React.JSX.Element | null {
  // Don't render screenshot tool use blocks here - they're handled separately
  if (getLabel(block) === "Screenshot") {
    return null;
  }

  return (
    <div className="mb-3 max-w-4/5">
      <div className="flex items-center gap-2">
        <HugeiconsIcon
          icon={getIcon(block)}
          className="text-bytebot-bronze-dark-9 h-4 w-4"
        />
        <p className="text-bytebot-bronze-light-11 text-xs">
          {getLabel(block)}
        </p>
        <ToolDetailsNormal block={block} />
      </div>
    </div>
  );
}
