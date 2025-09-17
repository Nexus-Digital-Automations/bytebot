import React from "react";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import { Camera01Icon } from "@hugeicons/core-free-icons";
import { ImageContentBlock } from "@bytebot/shared";

interface ImageContentProps {
  block: ImageContentBlock;
}

/**
 * Type guard to check if value is a valid ImageContentBlock
 * Handles cases where TypeScript treats the parameter as potentially error-typed
 */
function isImageContentBlock(value: unknown): value is ImageContentBlock {
  if (value === null || value === undefined || typeof value !== "object") {
    return false;
  }

  const candidate: Partial<ImageContentBlock> = value as Partial<ImageContentBlock>;

  if (candidate.type !== "image") {
    return false;
  }

  if (typeof candidate.source !== "object" || candidate.source === null) {
    return false;
  }

  const source: Record<string, unknown> = candidate.source as Record<string, unknown>;

  return (
    typeof source.data === "string" &&
    typeof source.media_type === "string" &&
    typeof source.type === "string"
  );
}

// Constants for image dimensions - avoiding magic numbers
const DEFAULT_IMAGE_WIDTH = 250;
const DEFAULT_IMAGE_HEIGHT = 250;
const FALLBACK_ALT_TEXT = "Screenshot";
const LOG_PREFIX_LENGTH = 50;

/**
 * Type guard to safely validate ImageContentBlock structure
 * Provides comprehensive type safety for image source data
 */
function isValidImageContentBlock(block: unknown): block is ImageContentBlock {
  // First check if it's a valid ImageContentBlock type
  if (!isImageContentBlock(block)) {
    return false;
  }

  // Now we can safely access properties since TypeScript knows it's an ImageContentBlock
  const imageBlock = block;

  // Handle each validation step explicitly for strict boolean expressions
  if (imageBlock.source === null || imageBlock.source === undefined) {
    return false;
  }

  if (typeof imageBlock.source !== "object") {
    return false;
  }

  if (typeof imageBlock.source.data !== "string") {
    return false;
  }

  if (imageBlock.source.data.length === 0) {
    return false;
  }

  if (imageBlock.source.media_type !== "image/png") {
    return false;
  }

  if (imageBlock.source.type !== "base64") {
    return false;
  }

  return true;
}

/**
 * Safely extracts base64 image data with comprehensive validation
 * Prevents unsafe member access and ensures data integrity
 */
function getImageSourceData(block: unknown): string | null {
  if (!isValidImageContentBlock(block)) {
    // Console usage restricted to development environment only
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.warn("Invalid ImageContentBlock structure detected", {
        hasBlock: Boolean(block),
        blockType: typeof block,
      });
    }
    return null;
  }

  // Safe access after validation - TypeScript now knows it's valid
  return block.source.data;
}

export function ImageContent({ block }: ImageContentProps): React.JSX.Element {
  // First, validate that we have a proper ImageContentBlock
  if (!isImageContentBlock(block)) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("ImageContent received invalid block", { block });
    }
    return (
      <div className="mb-3 max-w-4/5">
        <div className="mb-2 flex items-center gap-2">
          <HugeiconsIcon
            icon={Camera01Icon}
            className="text-bytebot-bronze-dark-9 h-4 w-4"
          />
          <p className="text-bytebot-bronze-light-11 text-xs">
            Screenshot unavailable
          </p>
        </div>
        <div className="border-bytebot-bronze-light-7 inline-block overflow-hidden rounded-md border bg-gray-100 p-4">
          <p className="text-sm text-gray-500">Invalid image block type</p>
        </div>
      </div>
    );
  }

  // Now TypeScript knows block is a valid ImageContentBlock
  const validBlock = block;

  // Comprehensive logging for debugging and monitoring - development only
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.debug("ImageContent component rendering", {
      blockType: validBlock.type,
      hasSource: Boolean(validBlock.source),
      sourceType: validBlock.source?.type,
      mediaType: validBlock.source?.media_type,
      dataLength: validBlock.source?.data?.length ?? 0,
    });
  }

  // Safe data extraction with type safety
  const imageData = getImageSourceData(validBlock);

  // Handle invalid or missing image data gracefully - explicit null/undefined check
  if (imageData === null || imageData === undefined || imageData === "") {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("Failed to extract valid image data from block", {
        block: validBlock,
      });
    }
    return (
      <div className="mb-3 max-w-4/5">
        <div className="mb-2 flex items-center gap-2">
          <HugeiconsIcon
            icon={Camera01Icon}
            className="text-bytebot-bronze-dark-9 h-4 w-4"
          />
          <p className="text-bytebot-bronze-light-11 text-xs">
            Screenshot unavailable
          </p>
        </div>
        <div className="border-bytebot-bronze-light-7 inline-block overflow-hidden rounded-md border bg-gray-100 p-4">
          <p className="text-sm text-gray-500">Image data not available</p>
        </div>
      </div>
    );
  }

  // Construct data URI with validated data
  const imageSource = `data:image/png;base64,${imageData}`;

  return (
    <div className="mb-3 max-w-4/5">
      <div className="mb-2 flex items-center gap-2">
        <HugeiconsIcon
          icon={Camera01Icon}
          className="text-bytebot-bronze-dark-9 h-4 w-4"
        />
        <p className="text-bytebot-bronze-light-11 text-xs">Screenshot taken</p>
      </div>
      <div className="border-bytebot-bronze-light-7 inline-block overflow-hidden rounded-md border">
        <Image
          src={imageSource}
          alt={FALLBACK_ALT_TEXT}
          width={DEFAULT_IMAGE_WIDTH}
          height={DEFAULT_IMAGE_HEIGHT}
          className="block object-contain"
          onError={(error: React.SyntheticEvent<HTMLImageElement, Event>) => {
            if (process.env.NODE_ENV === "development") {
              // eslint-disable-next-line no-console
              console.error("Failed to load image", {
                error: error.type,
                imageSource: `${imageSource.substring(0, LOG_PREFIX_LENGTH)}...`,
                block: validBlock,
              });
            }
          }}
          onLoad={() => {
            if (process.env.NODE_ENV === "development") {
              // eslint-disable-next-line no-console
              console.debug("Image loaded successfully", {
                width: DEFAULT_IMAGE_WIDTH,
                height: DEFAULT_IMAGE_HEIGHT,
              });
            }
          }}
        />
      </div>
    </div>
  );
}
