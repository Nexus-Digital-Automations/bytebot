import React from "react";
import { ToolResultContentBlock } from "@bytebot/shared";
import { AlertCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

interface ErrorContentProps {
  block: ToolResultContentBlock;
}

/**
 * Safely extracts error text from a ToolResultContentBlock using defensive programming
 * This implementation uses explicit type checking to satisfy strict TypeScript rules
 * @param block - The tool result content block to extract text from
 * @returns The error text string or default message
 */
function getErrorText(block: ToolResultContentBlock): string {
  const defaultMessage = "Error running tool";

  try {
    // Multiple defensive checks to ensure type safety
    if (typeof block !== "object" || block === null) {
      return defaultMessage;
    }

    // Check if content property exists using explicit property access
    if (!("content" in block)) {
      return defaultMessage;
    }

    // Get content with explicit type validation using safer approach
    const blockAsRecord = block as Record<string, unknown>;
    const blockContent = blockAsRecord.content;
    if (!Array.isArray(blockContent) || blockContent.length === 0) {
      return defaultMessage;
    }

    // Get first item with bounds checking using explicit array access
    const firstItem = blockContent[0] as unknown;
    if (typeof firstItem !== "object" || firstItem === null) {
      return defaultMessage;
    }

    // Check for text content block structure
    const item = firstItem as Record<string, unknown>;
    if (
      "type" in item &&
      item.type === "text" &&
      "text" in item &&
      typeof item.text === "string" &&
      item.text.length > 0
    ) {
      return item.text;
    }

    return defaultMessage;
  } catch {
    // Catch any unexpected errors and return default message
    return defaultMessage;
  }
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
