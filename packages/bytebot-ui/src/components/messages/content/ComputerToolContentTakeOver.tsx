import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ComputerToolUseContentBlock,
  Coordinates,
  isPressKeysToolUseBlock,
  isScrollToolUseBlock,
  isTypeKeysToolUseBlock,
  isTypeTextToolUseBlock,
  isWaitToolUseBlock,
} from "@bytebot/shared";
import { getIcon, getLabel } from "./ComputerToolUtils";

/**
 * Type guard to safely check if a value has coordinates property
 */
function hasCoordinates(obj: unknown): obj is { coordinates: Coordinates } {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "coordinates" in obj &&
    typeof (obj as { coordinates: unknown }).coordinates === "object" &&
    (obj as { coordinates: unknown }).coordinates !== null &&
    "x" in (obj as { coordinates: Coordinates }).coordinates &&
    "y" in (obj as { coordinates: Coordinates }).coordinates &&
    typeof (obj as { coordinates: Coordinates }).coordinates.x === "number" &&
    typeof (obj as { coordinates: Coordinates }).coordinates.y === "number"
  );
}

/**
 * Type guard to safely check if a value has path property with Coordinates array
 */
function hasPath(obj: unknown): obj is { path: Coordinates[] } {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "path" in obj &&
    Array.isArray((obj as { path: unknown }).path) &&
    (obj as { path: unknown[] }).path.every(
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
 * Type guard to safely check if a value has keys property
 */
function hasKeys(obj: unknown): obj is { keys: string[] } {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "keys" in obj &&
    Array.isArray((obj as { keys: unknown }).keys) &&
    (obj as { keys: unknown[] }).keys.every(
      (key: unknown) => typeof key === "string",
    )
  );
}

/**
 * Type guard to safely check if a value has text property
 */
function hasText(obj: unknown): obj is { text: string; isSensitive?: boolean } {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "text" in obj &&
    typeof (obj as { text: unknown }).text === "string"
  );
}

/**
 * Type guard to safely check if a value has duration property
 */
function hasDuration(obj: unknown): obj is { duration: number } {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "duration" in obj &&
    typeof (obj as { duration: unknown }).duration === "number"
  );
}

/**
 * Type guard to safely check if a value has direction and scrollCount properties
 */
function hasScrollProperties(
  obj: unknown,
): obj is { direction: string; scrollCount: number } {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "direction" in obj &&
    "scrollCount" in obj &&
    typeof (obj as { direction: unknown }).direction === "string" &&
    typeof (obj as { scrollCount: unknown }).scrollCount === "number"
  );
}

/**
 * Safely checks if block is valid ComputerToolUseContentBlock with proper input
 */
function isValidComputerToolBlock(
  block: unknown,
): block is ComputerToolUseContentBlock & { input: Record<string, unknown> } {
  return (
    typeof block === "object" &&
    block !== null &&
    "input" in block &&
    typeof (block as { input: unknown }).input === "object" &&
    (block as { input: unknown }).input !== null
  );
}

interface ComputerToolContentTakeOverProps {
  block: ComputerToolUseContentBlock;
}

function ToolDetailsTakeOver({
  block,
}: {
  block: ComputerToolUseContentBlock;
}): React.JSX.Element {
  const baseClasses =
    "px-1 py-0.5 text-xs text-fuchsia-600 bg-bytebot-red-light-1 border border-bytebot-bronze-light-7 rounded-md";

  // Early validation to ensure block is properly typed
  if (!isValidComputerToolBlock(block)) {
    return <></>;
  }

  return (
    <>
      {/* Text for type and key actions */}
      {(isTypeKeysToolUseBlock(block) || isPressKeysToolUseBlock(block)) &&
        hasKeys(block.input) && (
          <p className={baseClasses}>{String(block.input.keys.join("+"))}</p>
        )}

      {isTypeTextToolUseBlock(block) && hasText(block.input) && (
        <p className={baseClasses}>
          {String(
            (block.input.isSensitive ?? false)
              ? "●".repeat(block.input.text.length)
              : block.input.text,
          )}
        </p>
      )}

      {/* Duration for wait actions */}
      {isWaitToolUseBlock(block) && hasDuration(block.input) && (
        <p className={baseClasses}>{`${String(block.input.duration)}ms`}</p>
      )}

      {/* Coordinates for click/mouse actions */}
      {hasCoordinates(block.input) && (
        <p className={baseClasses}>
          {String(block.input.coordinates.x)},{" "}
          {String(block.input.coordinates.y)}
        </p>
      )}

      {/* Start and end coordinates for path actions */}
      {hasPath(block.input) && block.input.path.length > 0 && (
        <p className={baseClasses}>
          From: {String(block.input.path[0]?.x ?? "0")},{" "}
          {String(block.input.path[0]?.y ?? "0")} → To:{" "}
          {String(block.input.path[block.input.path.length - 1]?.x ?? "0")},{" "}
          {String(block.input.path[block.input.path.length - 1]?.y ?? "0")}
        </p>
      )}

      {/* Scroll information */}
      {isScrollToolUseBlock(block) && hasScrollProperties(block.input) && (
        <p className={baseClasses}>
          {String(block.input.direction)} {String(block.input.scrollCount)}
        </p>
      )}
    </>
  );
}

export function ComputerToolContentTakeOver({
  block,
}: ComputerToolContentTakeOverProps): React.JSX.Element | null {
  // Don't render screenshot tool use blocks here - they're handled separately
  if (getLabel(block) === "Screenshot") {
    return null;
  }

  return (
    <div className="max-w-4/5">
      <div className="flex items-center justify-start gap-2">
        <div className="flex h-7 w-7 items-center justify-center">
          <HugeiconsIcon
            icon={getIcon(block)}
            className="h-4 w-4 text-fuchsia-600"
          />
        </div>
        <p className="text-bytebot-bronze-light-11 text-xs">
          {getLabel(block)}
        </p>
        <ToolDetailsTakeOver block={block} />
      </div>
    </div>
  );
}
