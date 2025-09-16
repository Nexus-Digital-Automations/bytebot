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
 * Safe type assertion to ensure we can work with the block safely
 */
function assertValidBlock(
  block: unknown,
): asserts block is ComputerToolUseContentBlock {
  if (block === null || block === undefined || typeof block !== "object") {
    throw new Error("Invalid block: not an object");
  }
  if (
    !("name" in block) ||
    typeof (block as { name?: unknown }).name !== "string"
  ) {
    throw new Error("Invalid block: missing or invalid name property");
  }
}

/**
 * Safe type guard wrapper that handles type assertion issues
 */
function safeTypeGuard<T>(
  guard: (obj: unknown) => obj is T,
  block: unknown,
): boolean {
  try {
    assertValidBlock(block);
    const result = guard(block);
    return Boolean(result);
  } catch {
    return false;
  }
}

/**
 * Safe property access for block input with comprehensive type checking
 */
function hasValidInput(block: unknown): boolean {
  try {
    assertValidBlock(block);
    const typedBlock = block;

    return (
      "input" in typedBlock &&
      typedBlock.input !== null &&
      typedBlock.input !== undefined &&
      typeof typedBlock.input === "object"
    );
  } catch {
    return false;
  }
}

/**
 * Get button value safely
 */
function getButtonValue(block: unknown): string | undefined {
  try {
    assertValidBlock(block);
    const typedBlock = block;

    if (
      "input" in typedBlock &&
      typedBlock.input !== null &&
      typedBlock.input !== undefined &&
      typeof typedBlock.input === "object" &&
      "button" in typedBlock.input
    ) {
      const button = (typedBlock.input as { button?: unknown }).button;
      return typeof button === "string" ? button : undefined;
    }
    return undefined;
  } catch {
    return undefined;
  }
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
    const buttonValue = getButtonValue(block);
    if (buttonValue === "right") {
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
    if (hasValidInput(block)) {
      try {
        assertValidBlock(block);
        const typedBlock = block;
        const input = typedBlock.input as {
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
      } catch {
        // Fall through to default
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
