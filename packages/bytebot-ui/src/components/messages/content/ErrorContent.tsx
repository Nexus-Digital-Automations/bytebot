import React from "react";
import {
  TextContentBlock,
  ToolResultContentBlock,
  isTextContentBlock,
} from "@bytebot/shared";
import { AlertCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

interface ErrorContentProps {
  block: ToolResultContentBlock;
}

/**
 * Safely extracts error text from a ToolResultContentBlock
 * @param block - The tool result content block to extract text from
 * @returns The error text string or default message
 */
function getErrorText(block: ToolResultContentBlock): string {
  // Type-safe access to block.content with proper validation
  const content = block.content;

  // Ensure content exists and is an array
  if (!Array.isArray(content) || content.length === 0) {
    return "Error running tool";
  }

  // Get first content item with type safety
  const firstContentItem = content[0];

  // Type guard check with explicit type assertion
  if (firstContentItem && isTextContentBlock(firstContentItem)) {
    // TypeScript now knows firstContentItem is TextContentBlock
    const textBlock = firstContentItem as TextContentBlock;
    return textBlock.text;
  }

  return "Error running tool";
}

export function ErrorContent({ block }: ErrorContentProps): React.JSX.Element {
  const errorText = getErrorText(block);

  return (
    <div className="mb-3 rounded-md border border-red-200 bg-red-100 p-2">
      <div className="flex items-center justify-start gap-2">
        <HugeiconsIcon
          icon={AlertCircleIcon}
          className="h-5 w-5 text-red-800"
        />
        <div className="prose prose-sm max-w-none text-sm text-red-800">
          {errorText}
        </div>
      </div>
    </div>
  );
}
