import React from "react";
import ReactMarkdown from "react-markdown";
import { GroupedMessages } from "@/types";
import { MessageAvatar } from "./MessageAvatar";
import { MessageContentBlock, ToolResultContentBlock } from "@bytebot/shared";

/**
 * Enhanced type guard to check if a ToolResultContentBlock has valid content
 * Uses the shared type guard plus additional validation for content array
 */
function isValidToolResultWithContent(
  block: MessageContentBlock,
): block is ToolResultContentBlock {
  // Comprehensive null/undefined check
  if (block == null || typeof block !== "object") {
    return false;
  }

  // Check if it has the correct type property with safe casting
  const blockObj = block as Record<string, unknown>;
  const hasCorrectType = "type" in blockObj && blockObj.type === "tool_result";
  if (!hasCorrectType) {
    return false;
  }

  // Check for required tool_use_id property
  const hasToolUseId =
    "tool_use_id" in blockObj && typeof blockObj.tool_use_id === "string";
  if (!hasToolUseId) {
    return false;
  }

  // Check for content array with at least one item
  const hasValidContent =
    "content" in blockObj &&
    Array.isArray(blockObj.content) &&
    (blockObj.content as unknown[]).length > 0;

  return hasValidContent;
}

/**
 * Safely extracts content from a valid ToolResultContentBlock
 * Returns null if the block is invalid or has no content
 */
function getValidToolResultContent(
  block: MessageContentBlock,
): MessageContentBlock[] | null {
  if (!isValidToolResultWithContent(block)) {
    return null;
  }

  // Use type narrowing with proper property access
  if (typeof block === "object" && block !== null && "content" in block) {
    const blockWithContent = block as { content: unknown };
    if (Array.isArray(blockWithContent.content)) {
      // Safely cast and validate the content array
      const rawArray = blockWithContent.content;

      if (Array.isArray(rawArray) && rawArray.length > 0) {
        const validatedArray: MessageContentBlock[] = [];

        for (const item of rawArray) {
          if (item != null && typeof item === "object") {
            validatedArray.push(item as MessageContentBlock);
          }
        }

        return validatedArray.length > 0 ? validatedArray : null;
      }
    }
  }

  return null;
}

/**
 * Safe wrapper for isImageContentBlock that handles error types
 * Provides explicit type checking and error handling
 */
function safeIsImageContentBlock(contentItem: MessageContentBlock): boolean {
  if (contentItem == null || typeof contentItem !== "object") {
    return false;
  }

  try {
    // Manual type checking to avoid unsafe function calls
    // Check for image content block properties directly
    if (
      typeof contentItem === "object" &&
      "type" in contentItem &&
      (contentItem as { type: unknown }).type === "image" &&
      "source" in contentItem
    ) {
      const imageBlock = contentItem as { source: unknown };
      return (
        typeof imageBlock.source === "object" &&
        imageBlock.source !== null &&
        "data" in imageBlock.source &&
        "media_type" in imageBlock.source
      );
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Safe wrapper for isTextContentBlock that handles error types
 * Provides explicit type checking and error handling
 */
function safeIsTextContentBlock(block: MessageContentBlock): boolean {
  if (block == null || typeof block !== "object") {
    return false;
  }

  try {
    // Manual type checking to avoid unsafe function calls
    // Check for text content block properties directly
    if (
      typeof block === "object" &&
      "type" in block &&
      (block as { type: unknown }).type === "text" &&
      "text" in block &&
      typeof (block as { text: unknown }).text === "string"
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Safe text extraction from TextContentBlock with proper type guards
 * Returns empty string if block is invalid or not a text block
 */
function safeGetTextContent(block: MessageContentBlock): string {
  if (!safeIsTextContentBlock(block)) {
    return "";
  }

  // Use type narrowing with explicit property checking
  if (
    typeof block === "object" &&
    block !== null &&
    "text" in block &&
    typeof (block as { text: unknown }).text === "string"
  ) {
    return (block as { text: string }).text;
  }

  return "";
}

interface UserMessageProps {
  group: GroupedMessages;
  messageIdToIndex: Record<string, number>;
}

export function UserMessage({
  group,
  messageIdToIndex,
}: UserMessageProps): React.JSX.Element {
  const firstMessage = group.messages[0];
  if (firstMessage && messageIdToIndex[firstMessage.id] === 0) {
    return (
      <div className="bg-bytebot-bronze-light-4 sticky top-0 z-10">
        <div className="border-bytebot-bronze-light-7 bg-bytebot-bronze-light-2 flex items-start justify-start gap-2 rounded-t-lg border px-4 py-3">
          <MessageAvatar role={group.role} />

          <div>
            {group.messages.map((message) => (
              <div
                key={message.id}
                data-message-index={messageIdToIndex[message.id]}
              >
                {/* Render hidden divs for each screenshot block */}
                {message.content.map((block, blockIndex) => {
                  // Use safe helper function to extract content
                  const validContent = getValidToolResultContent(block);

                  if (validContent !== null && validContent.length > 0) {
                    // Check ALL content items in the tool result, not just the first one
                    const markers: React.ReactNode[] = [];

                    validContent.forEach(
                      (
                        contentItem: MessageContentBlock,
                        contentIndex: number,
                      ) => {
                        if (safeIsImageContentBlock(contentItem)) {
                          markers.push(
                            <div
                              key={`${blockIndex}-${contentIndex}`}
                              data-message-index={
                                messageIdToIndex[message.id] ?? 0
                              }
                              data-block-index={blockIndex}
                              data-content-index={contentIndex}
                              style={{
                                position: "absolute",
                                width: 0,
                                height: 0,
                                overflow: "hidden",
                              }}
                            />,
                          );
                        }
                      },
                    );
                    return markers;
                  }
                  return null;
                })}
                <div className="bg-bytebot-bronze-light-4 space-y-2 rounded-md px-2 py-1">
                  {message.content.map((block, index) => (
                    <div
                      key={index}
                      className="text-bytebot-bronze-light-12 text-sm"
                    >
                      {safeIsTextContentBlock(block) && (
                        <ReactMarkdown>
                          {safeGetTextContent(block)}
                        </ReactMarkdown>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bytebot-bronze-light-3 border-bytebot-bronze-light-7 flex items-start justify-end gap-2 border-x px-4 py-3">
      <div>
        {group.messages.map((message) => (
          <div
            key={message.id}
            data-message-index={messageIdToIndex[message.id]}
          >
            {/* Render hidden divs for each screenshot block */}
            {message.content.map((block, blockIndex) => {
              // Use safe helper function to extract content
              const validContent = getValidToolResultContent(block);

              if (validContent !== null && validContent.length > 0) {
                // Check ALL content items in the tool result, not just the first one
                const markers: React.ReactNode[] = [];

                validContent.forEach(
                  (contentItem: MessageContentBlock, contentIndex: number) => {
                    if (safeIsImageContentBlock(contentItem)) {
                      markers.push(
                        <div
                          key={`${blockIndex}-${contentIndex}`}
                          data-message-index={messageIdToIndex[message.id] ?? 0}
                          data-block-index={blockIndex}
                          data-content-index={contentIndex}
                          style={{
                            position: "absolute",
                            width: 0,
                            height: 0,
                            overflow: "hidden",
                          }}
                        />,
                      );
                    }
                  },
                );
                return markers;
              }
              return null;
            })}
            <div className="space-y-2 rounded-md text-fuchsia-600">
              {message.content.map((block, index) => (
                <div key={index} className="prose prose-sm max-w-none text-sm">
                  {safeIsTextContentBlock(block) && (
                    <ReactMarkdown>{safeGetTextContent(block)}</ReactMarkdown>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <MessageAvatar role={group.role} />
    </div>
  );
}
