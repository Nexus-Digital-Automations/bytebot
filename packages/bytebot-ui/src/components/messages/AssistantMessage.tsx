import React from "react";
import { GroupedMessages, TaskStatus } from "@/types";
import { MessageAvatar } from "./MessageAvatar";
import { MessageContent } from "./content/MessageContent";
import {
  MessageContentBlock,
  ToolResultContentBlock,
  isImageContentBlock,
} from "@bytebot/shared";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Type guard to check if a ToolResultContentBlock has valid content
 * Provides type-safe access to tool result content
 */
function isValidToolResultContent(
  block: unknown,
): block is ToolResultContentBlock & { content: MessageContentBlock[] } {
  // Comprehensive type safety check
  if (block == null || typeof block !== "object") {
    return false;
  }

  const obj = block as Record<string, unknown>;

  return (
    obj.type === "tool_result" &&
    typeof obj.tool_use_id === "string" &&
    Array.isArray(obj.content) &&
    (obj.content as unknown[]).length > 0 &&
    (obj.content as unknown[]).every(
      (item) => item != null && typeof item === "object",
    )
  );
}

/**
 * Type guard to check if a ToolResultContentBlock is not an error
 * Provides type-safe access to non-error tool results
 */
function isNonErrorToolResult(
  block: unknown,
): block is ToolResultContentBlock & {
  is_error: false;
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
    obj.is_error !== true &&
    Array.isArray(obj.content) &&
    (obj.content as unknown[]).length > 0 &&
    (obj.content as unknown[]).every(
      (item) => item != null && typeof item === "object",
    )
  );
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
                  if (isValidToolResultContent(block)) {
                    // Check ALL content items in the tool result, not just the first one
                    const markers: React.ReactNode[] = [];
                    // Safe access to content after successful type guard check
                    const validContent = block.content;
                    if (
                      Array.isArray(validContent) &&
                      validContent.length > 0
                    ) {
                      validContent.forEach(
                        (
                          contentItem: MessageContentBlock,
                          contentIndex: number,
                        ) => {
                          if (isImageContentBlock(contentItem)) {
                            markers.push(
                              <div
                                key={`${blockIndex}-${contentIndex}`}
                                data-message-index={
                                  messageIdToIndex[message.id]
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
                    }
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
                if (isNonErrorToolResult(block)) {
                  // Check ALL content items in the tool result, not just the first one
                  const markers: React.ReactNode[] = [];
                  // Safe access to content after successful type guard check
                  const validContent = block.content;
                  if (Array.isArray(validContent) && validContent.length > 0) {
                    validContent.forEach(
                      (
                        contentItem: MessageContentBlock,
                        contentIndex: number,
                      ) => {
                        if (isImageContentBlock(contentItem)) {
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
                  }
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
