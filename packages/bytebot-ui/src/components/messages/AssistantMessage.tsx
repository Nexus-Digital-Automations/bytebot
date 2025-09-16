import React from "react";
import { GroupedMessages, TaskStatus } from "@/types";
import { MessageAvatar } from "./MessageAvatar";
import { MessageContent } from "./content/MessageContent";
import {
  MessageContentBlock,
  ToolResultContentBlock,
  isImageContentBlock,
} from "@bytebot/shared";

/**
 * Safe wrapper for isImageContentBlock to handle strict boolean expressions
 */
function safeIsImageContentBlock(contentItem: MessageContentBlock): boolean {
  try {
    // Safe call with explicit type checking
    if (contentItem !== null && typeof contentItem === "object") {
      // Type-safe call with explicit boolean conversion and error handling
      try {
        // Direct property check to avoid unsafe function calls
        if (
          "type" in contentItem &&
          (contentItem as { type: unknown }).type === "image"
        ) {
          return true;
        }
        return false;
      } catch {
        // Handle function call errors safely
        return false;
      }
    }
    return false;
  } catch {
    return false;
  }
}
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Type guard to check if a ToolResultContentBlock has valid content and is not an error
 * Provides type-safe access to tool result content for takeover scenarios
 */
function isValidToolResultContent(
  block: unknown,
): block is ToolResultContentBlock & {
  content: MessageContentBlock[];
  is_error?: false | undefined;
} {
  // Comprehensive type safety check
  if (block == null || typeof block !== "object") {
    return false;
  }

  const obj = block as Record<string, unknown>;

  return (
    obj.type === "tool_result" &&
    typeof obj.tool_use_id === "string" &&
    // Ensure it's not an error case
    obj.is_error !== true &&
    Array.isArray(obj.content) &&
    (obj.content as unknown[]).length > 0 &&
    (obj.content as unknown[]).every(
      (item) => item != null && typeof item === "object",
    )
  );
}

/**
 * Type guard to check if a ToolResultContentBlock is not an error
 * Provides type-safe access to non-error tool results for normal message display
 */
function isNonErrorToolResult(
  block: unknown,
): block is ToolResultContentBlock & {
  is_error?: false | undefined;
  content: MessageContentBlock[];
} {
  // Comprehensive type safety check
  if (block == null || typeof block !== "object") {
    return false;
  }

  const obj = block as Record<string, unknown>;

  return (
    obj.type === "tool_result" &&
    typeof obj.tool_use_id === "string" &&
    // Explicitly check that it's not an error (false, undefined, or missing)
    obj.is_error !== true &&
    Array.isArray(obj.content) &&
    (obj.content as unknown[]).length > 0 &&
    (obj.content as unknown[]).every(
      (item) => item != null && typeof item === "object",
    )
  );
}

/**
 * Safely extracts content from a validated ToolResultContentBlock
 * Returns null if the block is invalid or in error state
 */
function getValidToolResultContent(
  block: unknown,
): MessageContentBlock[] | null {
  if (!isValidToolResultContent(block)) {
    return null;
  }

  // Use ultra-safe access pattern to avoid unsafe member access warning
  try {
    const validBlock = block as Record<string, unknown>;
    if ("content" in validBlock && Array.isArray(validBlock.content)) {
      // Ensure proper typing by validating each item
      const contentArray = validBlock.content as unknown[];
      if (
        contentArray.every((item) => Boolean(item) && typeof item === "object")
      ) {
        // Safe type assertion with explicit return type
        const typedArray: MessageContentBlock[] = [];
        contentArray.forEach((item) => {
          if (Boolean(item) && typeof item === "object") {
            typedArray.push(item as MessageContentBlock);
          }
        });
        // Explicit type return to avoid unsafe return warning
        return typedArray;
      }
    }
  } catch {
    // Ignore any errors and return null
  }

  return null;
}

/**
 * Safely extracts content from a non-error ToolResultContentBlock
 * Returns null if the block is invalid or in error state
 */
function getNonErrorToolResultContent(
  block: unknown,
): MessageContentBlock[] | null {
  if (!isNonErrorToolResult(block)) {
    return null;
  }

  // Use ultra-safe access pattern to avoid unsafe member access warning
  try {
    const validBlock = block as Record<string, unknown>;
    if ("content" in validBlock && Array.isArray(validBlock.content)) {
      // Ensure proper typing by validating each item
      const contentArray = validBlock.content as unknown[];
      if (
        contentArray.every((item) => Boolean(item) && typeof item === "object")
      ) {
        // Safe type assertion with explicit return type
        const typedArray: MessageContentBlock[] = [];
        contentArray.forEach((item) => {
          if (Boolean(item) && typeof item === "object") {
            typedArray.push(item as MessageContentBlock);
          }
        });
        // Explicit type return to avoid unsafe return warning
        return typedArray;
      }
    }
  } catch {
    // Ignore any errors and return null
  }

  return null;
}

interface AssistantMessageProps {
  group: GroupedMessages;
  taskStatus: TaskStatus;
  messageIdToIndex: Record<string, number>;
}

export function AssistantMessage({
  group,
  taskStatus,
  messageIdToIndex,
}: AssistantMessageProps): React.JSX.Element {
  return (
    <div
      className={cn(
        "bg-bytebot-bronze-light-3 border-bytebot-bronze-light-7 flex items-start justify-start gap-2 border-x px-4 py-3",
        ![TaskStatus.RUNNING, TaskStatus.NEEDS_HELP].includes(taskStatus) &&
          !(group.take_over ?? false) &&
          "border-bytebot-bronze-light-7 rounded-b-lg border-b",
      )}
    >
      <MessageAvatar role={group.role} />

      {(group.take_over ?? false) ? (
        <div className="border-bytebot-bronze-light-a6 bg-bytebot-bronze-light-a1 w-full rounded-2xl border p-2">
          <div className="flex items-center gap-2">
            <Image
              src="/indicators/indicator-pink.png"
              alt="User control status"
              width={15}
              height={15}
            />
            <p className="text-bytebot-bronze-light-12 text-[12px] font-medium">
              You took control
            </p>
          </div>
          <div className="bg-bytebot-bronze-light-2 mt-2 space-y-0.5 rounded-2xl p-1">
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
                              data-message-index={messageIdToIndex[message.id]}
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
                <MessageContent
                  content={message.content}
                  isTakeOver={message.take_over ?? false}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          {group.messages.map((message) => (
            <div
              key={message.id}
              data-message-index={messageIdToIndex[message.id]}
            >
              {/* Render hidden divs for each screenshot block */}
              {message.content.map((block, blockIndex) => {
                // Use safe helper function to extract content
                const validContent = getNonErrorToolResultContent(block);

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
                            data-message-index={messageIdToIndex[message.id]}
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
              <MessageContent
                content={message.content}
                isTakeOver={message.take_over ?? false}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
