import React from "react";
import ReactMarkdown from "react-markdown";
import { GroupedMessages } from "@/types";
import { MessageAvatar } from "./MessageAvatar";
import {
  MessageContentBlock,
  ToolResultContentBlock,
  isImageContentBlock,
  isTextContentBlock,
} from "@bytebot/shared";

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

  // Check if it has the correct type property
  const hasCorrectType = "type" in block && block.type === "tool_result";
  if (!hasCorrectType) {
    return false;
  }

  // Check for required tool_use_id property
  const hasToolUseId =
    "tool_use_id" in block && typeof block.tool_use_id === "string";
  if (!hasToolUseId) {
    return false;
  }

  // Check for content array with at least one item
  const hasValidContent =
    "content" in block &&
    Array.isArray(block.content) &&
    block.content.length > 0;

  return hasValidContent;
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
                  if (isValidToolResultWithContent(block)) {
                    // Check ALL content items in the tool result, not just the first one
                    const markers: React.ReactNode[] = [];
                    // Type guard ensures block is valid ToolResultContentBlock with content
                    block.content.forEach(
                      (
                        contentItem: MessageContentBlock,
                        contentIndex: number,
                      ) => {
                        if (isImageContentBlock(contentItem)) {
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
                      {isTextContentBlock(block) && (
                        <ReactMarkdown>{block.text}</ReactMarkdown>
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
              if (isValidToolResultWithContent(block)) {
                // Check ALL content items in the tool result, not just the first one
                const markers: React.ReactNode[] = [];
                // Type guard ensures block is valid ToolResultContentBlock with content
                block.content.forEach(
                  (contentItem: MessageContentBlock, contentIndex: number) => {
                    if (isImageContentBlock(contentItem)) {
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
                  {isTextContentBlock(block) && (
                    <ReactMarkdown>{block.text}</ReactMarkdown>
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
