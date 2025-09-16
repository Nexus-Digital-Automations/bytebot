import React from "react";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import { Camera01Icon } from "@hugeicons/core-free-icons";
import { ImageContentBlock } from "@bytebot/shared";

interface ImageContentProps {
  block: ImageContentBlock;
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
function isValidImageContentBlock(block: ImageContentBlock): boolean {
  // Handle each validation step explicitly for strict boolean expressions
  if (block?.source === null || block?.source === undefined) {
    return false;
  }

  if (typeof block.source !== "object") {
    return false;
  }

  if (typeof block.source.data !== "string") {
    return false;
  }

  if (block.source.data.length === 0) {
    return false;
  }

  if (block.source.media_type !== "image/png") {
    return false;
  }

  if (block.source.type !== "base64") {
    return false;
  }

  return true;
}

/**
 * Safely extracts base64 image data with comprehensive validation
 * Prevents unsafe member access and ensures data integrity
 */
function getImageSourceData(block: ImageContentBlock): string | null {
  if (!isValidImageContentBlock(block)) {
    // Console usage restricted to development environment only
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.warn("Invalid ImageContentBlock structure detected", {
        hasBlock: Boolean(block),
        hasSource: Boolean(block?.source),
        hasData: Boolean(block?.source?.data),
        dataType: typeof block?.source?.data,
        mediaType: block?.source?.media_type,
        sourceType: block?.source?.type,
      });
    }
    return null;
  }

  // Safe access with type assertion after validation
  return block.source.data;
}

export function ImageContent({ block }: ImageContentProps): React.JSX.Element {
  // Comprehensive logging for debugging and monitoring - development only
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.debug("ImageContent component rendering", {
      blockType: block?.type,
      hasSource: Boolean(block?.source),
      sourceType: block?.source?.type,
      mediaType: block?.source?.media_type,
      dataLength: block?.source?.data?.length ?? 0,
    });
  }

  // Safe data extraction with type safety
  const imageData = getImageSourceData(block);

  // Handle invalid or missing image data gracefully - explicit null/undefined check
  if (imageData === null || imageData === undefined || imageData === "") {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("Failed to extract valid image data from block", { block });
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
          onError={(error) => {
            if (process.env.NODE_ENV === "development") {
              // eslint-disable-next-line no-console
              console.error("Failed to load image", {
                error,
                imageSource: `${imageSource.substring(0, LOG_PREFIX_LENGTH)}...`,
                block,
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
