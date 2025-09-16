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

/**
 * Type guard to safely validate ImageContentBlock structure
 * Provides comprehensive type safety for image source data
 */
function isValidImageContentBlock(block: ImageContentBlock): boolean {
  return Boolean(
    block?.source &&
      typeof block.source === "object" &&
      typeof block.source.data === "string" &&
      block.source.data.length > 0 &&
      block.source.media_type === "image/png" &&
      block.source.type === "base64",
  );
}

/**
 * Safely extracts base64 image data with comprehensive validation
 * Prevents unsafe member access and ensures data integrity
 */
function getImageSourceData(block: ImageContentBlock): string | null {
  if (!isValidImageContentBlock(block)) {
    console.warn("Invalid ImageContentBlock structure detected", {
      hasBlock: Boolean(block),
      hasSource: Boolean(block?.source),
      hasData: Boolean(block?.source?.data),
      dataType: typeof block?.source?.data,
      mediaType: block?.source?.media_type,
      sourceType: block?.source?.type,
    });
    return null;
  }

  // Safe access with type assertion after validation
  return block.source.data;
}

export function ImageContent({ block }: ImageContentProps): React.JSX.Element {
  // Comprehensive logging for debugging and monitoring
  console.debug("ImageContent component rendering", {
    blockType: block?.type,
    hasSource: Boolean(block?.source),
    sourceType: block?.source?.type,
    mediaType: block?.source?.media_type,
    dataLength: block?.source?.data?.length ?? 0,
  });

  // Safe data extraction with type safety
  const imageData = getImageSourceData(block);

  // Handle invalid or missing image data gracefully
  if (!imageData) {
    console.error("Failed to extract valid image data from block", { block });
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
            console.error("Failed to load image", {
              error,
              imageSource: `${imageSource.substring(0, 50)}...`,
              block,
            });
          }}
          onLoad={() => {
            console.debug("Image loaded successfully", {
              width: DEFAULT_IMAGE_WIDTH,
              height: DEFAULT_IMAGE_HEIGHT,
            });
          }}
        />
      </div>
    </div>
  );
}
