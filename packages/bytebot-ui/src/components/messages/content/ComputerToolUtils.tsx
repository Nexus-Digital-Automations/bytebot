import {
  BrowserIcon,
  Camera01Icon,
  Cursor02Icon,
  FileIcon,
  FilePasteIcon,
  MouseRightClick06Icon,
  TimeQuarter02Icon,
  TypeCursorIcon,
  User03Icon,
} from "@hugeicons/core-free-icons";
import {
  ComputerToolUseContentBlock,
  isApplicationToolUseBlock,
  isClickMouseToolUseBlock,
  isCursorPositionToolUseBlock,
  isDragMouseToolUseBlock,
  isMoveMouseToolUseBlock,
  isPasteTextToolUseBlock,
  isPressKeysToolUseBlock,
  isPressMouseToolUseBlock,
  isReadFileToolUseBlock,
  isScreenshotToolUseBlock,
  isScrollToolUseBlock,
  isTraceMouseToolUseBlock,
  isTypeKeysToolUseBlock,
  isTypeTextToolUseBlock,
  isWaitToolUseBlock,
} from "@bytebot/shared";
import { TRIPLE_CLICK_COUNT } from "@/constants/ui";

// Define the IconType for proper type checking
export type IconType =
  | typeof Camera01Icon
  | typeof User03Icon
  | typeof Cursor02Icon
  | typeof TypeCursorIcon
  | typeof MouseRightClick06Icon
  | typeof TimeQuarter02Icon
  | typeof BrowserIcon
  | typeof FilePasteIcon
  | typeof FileIcon;

/**
 * Safe type guard wrapper to handle potential type safety issues
 * Ensures boolean return and handles any runtime type checking errors
 */
function safeTypeGuard<T>(
  guard: (obj: unknown) => obj is T,
  block: ComputerToolUseContentBlock,
): boolean {
  try {
    // Explicit type casting to handle the "error" type issue
    const result = guard(block as unknown);
    return Boolean(result);
  } catch (_error) {
    // Log type guard failure for debugging
    // console.warn("Type guard failed", { error: _error, block });
    return false;
  }
}

/**
 * Safe property access for block input with proper type checking
 */
function hasButtonProperty(
  block: ComputerToolUseContentBlock,
): block is ComputerToolUseContentBlock & { input: { button: string } } {
  return (
    Boolean(block) &&
    typeof block === "object" &&
    "input" in block &&
    Boolean(block.input) &&
    typeof block.input === "object" &&
    "button" in block.input &&
    typeof (block.input as { button?: unknown }).button === "string"
  );
}

export function getIcon(block: ComputerToolUseContentBlock): IconType {
  // Comprehensive logging for debugging
  // console.debug("ComputerToolUtils.getIcon", {
  //   blockType: block?.name,
  //   hasInput: Boolean(block?.input),
  // });

  if (safeTypeGuard(isScreenshotToolUseBlock, block)) {
    return Camera01Icon;
  }

  if (safeTypeGuard(isWaitToolUseBlock, block)) {
    return TimeQuarter02Icon;
  }

  if (
    safeTypeGuard(isTypeKeysToolUseBlock, block) ||
    safeTypeGuard(isTypeTextToolUseBlock, block) ||
    safeTypeGuard(isPressKeysToolUseBlock, block)
  ) {
    return TypeCursorIcon;
  }

  if (safeTypeGuard(isPasteTextToolUseBlock, block)) {
    return FilePasteIcon;
  }

  if (
    safeTypeGuard(isMoveMouseToolUseBlock, block) ||
    safeTypeGuard(isScrollToolUseBlock, block) ||
    safeTypeGuard(isCursorPositionToolUseBlock, block) ||
    safeTypeGuard(isClickMouseToolUseBlock, block) ||
    safeTypeGuard(isDragMouseToolUseBlock, block) ||
    safeTypeGuard(isPressMouseToolUseBlock, block) ||
    safeTypeGuard(isTraceMouseToolUseBlock, block)
  ) {
    // Safe access to button property
    if (hasButtonProperty(block) && block.input.button === "right") {
      return MouseRightClick06Icon;
    }

    return Cursor02Icon;
  }

  if (safeTypeGuard(isApplicationToolUseBlock, block)) {
    return BrowserIcon;
  }

  if (safeTypeGuard(isReadFileToolUseBlock, block)) {
    return FileIcon;
  }

  return User03Icon;
}

export function getLabel(block: ComputerToolUseContentBlock): string {
  // Comprehensive logging for debugging
  // console.debug("ComputerToolUtils.getLabel", {
  //   blockType: block?.name,
  //   hasInput: Boolean(block?.input),
  // });

  if (safeTypeGuard(isScreenshotToolUseBlock, block)) {
    return "Screenshot";
  }

  if (safeTypeGuard(isWaitToolUseBlock, block)) {
    return "Wait";
  }

  if (safeTypeGuard(isTypeKeysToolUseBlock, block)) {
    return "Keys";
  }

  if (safeTypeGuard(isTypeTextToolUseBlock, block)) {
    return "Type";
  }

  if (safeTypeGuard(isPasteTextToolUseBlock, block)) {
    return "Paste";
  }

  if (safeTypeGuard(isPressKeysToolUseBlock, block)) {
    return "Press Keys";
  }

  if (safeTypeGuard(isMoveMouseToolUseBlock, block)) {
    return "Move Mouse";
  }

  if (safeTypeGuard(isScrollToolUseBlock, block)) {
    return "Scroll";
  }

  if (safeTypeGuard(isCursorPositionToolUseBlock, block)) {
    return "Cursor Position";
  }

  if (safeTypeGuard(isClickMouseToolUseBlock, block)) {
    // Safe access with comprehensive type checking
    if (Boolean(block.input) && typeof block.input === "object") {
      const input = block.input as {
        button?: string;
        clickCount?: number;
      };

      const button = input.button;
      if (button === "left") {
        if (typeof input.clickCount === "number" && input.clickCount === 2) {
          return "Double Click";
        }

        if (
          typeof input.clickCount === "number" &&
          input.clickCount === TRIPLE_CLICK_COUNT
        ) {
          return "Triple Click";
        }

        return "Click";
      }

      if (typeof button === "string" && button.length > 0) {
        const capitalizedButton =
          button.charAt(0).toUpperCase() + button.slice(1);
        return `${capitalizedButton} Click`;
      }
    }
    return "Click";
  }

  if (safeTypeGuard(isDragMouseToolUseBlock, block)) {
    return "Drag";
  }

  if (safeTypeGuard(isPressMouseToolUseBlock, block)) {
    return "Press Mouse";
  }

  if (safeTypeGuard(isTraceMouseToolUseBlock, block)) {
    return "Trace Mouse";
  }

  if (safeTypeGuard(isApplicationToolUseBlock, block)) {
    return "Open Application";
  }

  if (safeTypeGuard(isReadFileToolUseBlock, block)) {
    return "Read File";
  }

  return "Unknown";
}
