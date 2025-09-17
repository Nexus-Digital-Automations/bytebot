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
  if (typeof obj !== "object" || obj === null || !("coordinates" in obj)) {
    return false;
  }

  const objWithCoords = obj as { coordinates: unknown };
  const coords = objWithCoords.coordinates;

  if (typeof coords !== "object" || coords === null) {
    return false;
  }

  const coordsObj = coords as Record<string, unknown>;

  return (
    "x" in coordsObj &&
    "y" in coordsObj &&
    typeof coordsObj.x === "number" &&
    typeof coordsObj.y === "number"
  );
}

/**
 * Type guard to safely check if a value has path property with Coordinates array
 */
function hasPath(obj: unknown): obj is { path: Coordinates[] } {
  if (typeof obj !== "object" || obj === null || !("path" in obj)) {
    return false;
  }

  const objWithPath = obj as { path: unknown };
  const path = objWithPath.path;

  if (!Array.isArray(path)) {
    return false;
  }

  return path.every((point: unknown): point is Coordinates => {
    if (typeof point !== "object" || point === null) {
      return false;
    }

    const pointObj = point as Record<string, unknown>;

    return (
      "x" in pointObj &&
      "y" in pointObj &&
      typeof pointObj.x === "number" &&
      typeof pointObj.y === "number"
    );
  });
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
  if (typeof block !== "object" || block === null) {
    return false;
  }

  const blockObj = block as Record<string, unknown>;

  return (
    "input" in blockObj &&
    typeof blockObj.input === "object" &&
    blockObj.input !== null
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

  // Type-safe access to input property with explicit validation
  const blockWithInput = block as ComputerToolUseContentBlock;
  const input: Record<string, unknown> = blockWithInput.input as Record<string, unknown>;

  return (
    <>
      {/* Text for type and key actions */}
      {(Boolean(
        typeof isTypeKeysToolUseBlock === "function"
          ? isTypeKeysToolUseBlock(blockWithInput as unknown)
          : false,
      ) ||
        Boolean(
          typeof isPressKeysToolUseBlock === "function"
            ? isPressKeysToolUseBlock(blockWithInput as unknown)
            : false,
        )) &&
        hasKeys(input) && (
          <p className={baseClasses}>
            {String((input as { keys: string[] }).keys.join("+"))}
          </p>
        )}

      {Boolean(
        typeof isTypeTextToolUseBlock === "function"
          ? isTypeTextToolUseBlock(blockWithInput as unknown)
          : false,
      ) &&
        hasText(input) && (
          <p className={baseClasses}>
            {String(
              ((input as { isSensitive?: boolean }).isSensitive ?? false)
                ? "●".repeat(Number((input as { text: string }).text.length))
                : (input as { text: string }).text,
            )}
          </p>
        )}

      {/* Duration for wait actions */}
      {Boolean(
        typeof isWaitToolUseBlock === "function"
          ? isWaitToolUseBlock(blockWithInput as unknown)
          : false,
      ) &&
        hasDuration(input) && (
          <p
            className={baseClasses}
          >{`${String((input as { duration: number }).duration)}ms`}</p>
        )}

      {/* Coordinates for click/mouse actions */}
      {hasCoordinates(input) && (
        <p className={baseClasses}>
          {String((input as { coordinates: Coordinates }).coordinates.x)},{" "}
          {String((input as { coordinates: Coordinates }).coordinates.y)}
        </p>
      )}

      {/* Start and end coordinates for path actions */}
      {hasPath(input) && (input as { path: Coordinates[] }).path.length > 0 && (
        <p className={baseClasses}>
          From: {String((input as { path: Coordinates[] }).path[0]?.x ?? 0)},{" "}
          {String((input as { path: Coordinates[] }).path[0]?.y ?? 0)} → To:{" "}
          {String(
            (input as { path: Coordinates[] }).path[
              (input as { path: Coordinates[] }).path.length - 1
            ]?.x ?? 0,
          )}
          ,{" "}
          {String(
            (input as { path: Coordinates[] }).path[
              (input as { path: Coordinates[] }).path.length - 1
            ]?.y ?? 0,
          )}
        </p>
      )}

      {/* Scroll information */}
      {Boolean(
        typeof isScrollToolUseBlock === "function"
          ? isScrollToolUseBlock(blockWithInput)
          : false,
      ) &&
        hasScrollProperties(input) && (
          <p className={baseClasses}>
            {String((input as { direction: string }).direction)}{" "}
            {String((input as { scrollCount: number }).scrollCount)}
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
