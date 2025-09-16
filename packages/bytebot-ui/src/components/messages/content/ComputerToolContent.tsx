import React from "react";
import { ComputerToolUseContentBlock } from "@bytebot/shared";
import { ComputerToolContentTakeOver } from "./ComputerToolContentTakeOver";
import { ComputerToolContentNormal } from "./ComputerToolContentNormal";

interface ComputerToolContentProps {
  block: ComputerToolUseContentBlock;
  isTakeOver?: boolean;
}

/**
 * Type guard to ensure block is a valid ComputerToolUseContentBlock
 */
function isValidComputerToolBlock(
  block: unknown,
): block is ComputerToolUseContentBlock {
  return (
    typeof block === "object" &&
    block !== null &&
    "type" in block &&
    (block as { type: unknown }).type === "computer_tool_use"
  );
}

export function ComputerToolContent({
  block,
  isTakeOver = false,
}: ComputerToolContentProps): React.JSX.Element {
  // Validate block type for safety
  if (!isValidComputerToolBlock(block)) {
    return <div>Invalid computer tool block</div>;
  }

  // After type guard validation, the block is safe to use

  if (isTakeOver) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    return <ComputerToolContentTakeOver block={block} />;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  return <ComputerToolContentNormal block={block} />;
}
