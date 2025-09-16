import React from "react";
import {
  MessageContentBlock,
  MessageContentType,
  ToolResultContentBlock,
  isComputerToolUseContentBlock,
  isImageContentBlock,
  isTextContentBlock,
  isToolResultContentBlock,
} from "@bytebot/shared";
import { TextContent } from "./TextContent";
import { ImageContent } from "./ImageContent";
import { ComputerToolContent } from "./ComputerToolContent";
import { ErrorContent } from "./ErrorContent";

interface MessageContentProps {
  content: MessageContentBlock[];
  isTakeOver?: boolean;
}

/**
 * Type guard to safely check if a ToolResultContentBlock contains valid content
 * @param block The block to validate
 * @returns Type predicate indicating block has valid content array
 */
function isValidToolResultContent(
  block: MessageContentBlock,
): block is ToolResultContentBlock & { content: MessageContentBlock[] } {
  return (
    isToolResultContentBlock(block) &&
    Array.isArray(block.content) &&
    block.content.length > 0
  );
}

/**
 * Type guard to check if a ToolResultContentBlock is not an error
 * @param block The block to validate
 * @returns Type predicate indicating block is not an error
 */
function isNonErrorToolResult(
  block: MessageContentBlock,
): block is ToolResultContentBlock & { is_error: false } {
  return isToolResultContentBlock(block) && block.is_error === false;
}

export function MessageContent({
  content,
  isTakeOver = false,
}: MessageContentProps): React.JSX.Element | null {
  // Filter content blocks and check if any visible content remains
  const visibleBlocks = content.filter((block): block is MessageContentBlock => {
    // Filter logic with type-safe operations
    if (isValidToolResultContent(block)) {
      // Safe access to content after successful type guard check
      const hasImageContent = block.content.some((contentBlock: MessageContentBlock) =>
        isImageContentBlock(contentBlock)
      );
      if (hasImageContent) {
        return true;
      }
    }
    
    if (
      isToolResultContentBlock(block) &&
      typeof block.tool_use_id === 'string' &&
      block.tool_use_id !== "set_task_status" &&
      block.is_error === false
    ) {
      return false;
    }
    return true;
  });

  // Skip rendering if no visible content
  if (!Array.isArray(visibleBlocks) || visibleBlocks.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      {visibleBlocks.map((block, index) => (
        <div key={index}>
          {isTextContentBlock(block) && <TextContent block={block} />}

          {isNonErrorToolResult(block) &&
            isValidToolResultContent(block) &&
            block.content.map(
              (
                contentBlock: MessageContentBlock,
                contentBlockIndex: number,
              ) => {
                if (isImageContentBlock(contentBlock)) {
                  return (
                    <ImageContent
                      key={contentBlockIndex}
                      block={contentBlock}
                    />
                  );
                }
                return null;
              },
            )}

          {isComputerToolUseContentBlock(block) && (
            <ComputerToolContent block={block} isTakeOver={isTakeOver} />
          )}

          {isToolResultContentBlock(block) && 
            typeof block.is_error === 'boolean' && 
            block.is_error === true && (
            <ErrorContent block={block} />
          )}

          {isNonErrorToolResult(block) &&
            isValidToolResultContent(block) &&
            typeof block.tool_use_id === 'string' &&
            block.tool_use_id === "set_task_status" &&
            block.content.length > 0 &&
            isTextContentBlock(block.content[0]) && (
              <TextContent block={block.content[0]} />
            )}
        </div>
      ))}
    </div>
  );
}
