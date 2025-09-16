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

  if (isTakeOver) {
    return <ComputerToolContentTakeOver block={block} />;
  }

  return <ComputerToolContentNormal block={block} />;
}
