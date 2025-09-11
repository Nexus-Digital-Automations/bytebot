import React from "react";
import {
  MessageContentBlock,
  MessageContentType,
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

export function MessageContent({
  content,
  isTakeOver = false,
}: MessageContentProps): React.JSX.Element | null {
  // Filter content blocks and check if any visible content remains
  const visibleBlocks = content.filter((block) => {
    // Filter logic from the original code
    if (
      isToolResultContentBlock(block) &&
      block.content?.some((contentBlock) => isImageContentBlock(contentBlock))
    ) {
      return true;
    }
    if (
      isToolResultContentBlock(block) &&
      block.tool_use_id !== "set_task_status" &&
      block.is_error === false
    ) {
      return false;
    }
    return true;
  });

  // Skip rendering if no visible content
  if (visibleBlocks.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      {visibleBlocks.map((block, index) => (
        <div key={index}>
          {isTextContentBlock(block) && <TextContent block={block} />}

          {isToolResultContentBlock(block) &&
            block.is_error === false &&
            block.content.map((contentBlock, contentBlockIndex) => {
              if (isImageContentBlock(contentBlock)) {
                return (
                  <ImageContent key={contentBlockIndex} block={contentBlock} />
                );
              }
              return null;
            })}

          {isComputerToolUseContentBlock(block) && (
            <ComputerToolContent block={block} isTakeOver={isTakeOver} />
          )}

          {isToolResultContentBlock(block) && block.is_error === true && (
            <ErrorContent block={block} />
          )}

          {isToolResultContentBlock(block) &&
            block.is_error === false &&
            block.tool_use_id === "set_task_status" &&
            block.content?.[0].type === MessageContentType._Text && (
              <TextContent block={block.content?.[0]} />
            )}
        </div>
      ))}
    </div>
  );
}
