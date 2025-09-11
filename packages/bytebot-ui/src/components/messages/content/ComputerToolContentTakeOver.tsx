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

interface ComputerToolContentTakeOverProps {
  block: ComputerToolUseContentBlock;
}

function ToolDetailsTakeOver({
  block,
}: {
  block: ComputerToolUseContentBlock;
}): JSX.Element {
  const baseClasses =
    "px-1 py-0.5 text-xs text-fuchsia-600 bg-bytebot-red-light-1 border border-bytebot-bronze-light-7 rounded-md";

  return (
    <>
      {/* Text for type and key actions */}
      {(isTypeKeysToolUseBlock(block) || isPressKeysToolUseBlock(block)) && (
        <p className={baseClasses}>{String(block.input.keys.join("+"))}</p>
      )}

      {isTypeTextToolUseBlock(block) && (
        <p className={baseClasses}>
          {String(
            (block.input.isSensitive ?? false)
              ? "●".repeat(block.input.text.length)
              : block.input.text,
          )}
        </p>
      )}

      {/* Duration for wait actions */}
      {isWaitToolUseBlock(block) && (
        <p className={baseClasses}>{`${block.input.duration}ms`}</p>
      )}

      {/* Coordinates for click/mouse actions */}
      {block.input.coordinates != null && (
        <p className={baseClasses}>
          {(block.input.coordinates as Coordinates).x},{" "}
          {(block.input.coordinates as Coordinates).y}
        </p>
      )}

      {/* Start and end coordinates for path actions */}
      {"path" in block.input &&
        Array.isArray(block.input.path) &&
        block.input.path.every(
          (point: unknown): point is Coordinates =>
            typeof point === "object" &&
            point !== null &&
            "x" in point &&
            "y" in point &&
            typeof (point as Coordinates).x === "number" &&
            typeof (point as Coordinates).y === "number",
        ) && (
          <p className={baseClasses}>
            From: {block.input.path[0].x}, {block.input.path[0].y} → To:{" "}
            {block.input.path[block.input.path.length - 1].x},{" "}
            {block.input.path[block.input.path.length - 1].y}
          </p>
        )}

      {/* Scroll information */}
      {isScrollToolUseBlock(block) && (
        <p className={baseClasses}>
          {String(block.input.direction)} {Number(block.input.scrollCount)}
        </p>
      )}
    </>
  );
}

export function ComputerToolContentTakeOver({
  block,
}: ComputerToolContentTakeOverProps): JSX.Element | null {
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
