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
  ClickMouseToolUseBlock,
  ComputerToolUseContentBlock,
  DragMouseToolUseBlock,
  PressMouseToolUseBlock,
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

export function getIcon(block: ComputerToolUseContentBlock): IconType {
  if (isScreenshotToolUseBlock(block) === true) {
    return Camera01Icon;
  }

  if (isWaitToolUseBlock(block) === true) {
    return TimeQuarter02Icon;
  }

  if (
    isTypeKeysToolUseBlock(block) === true ||
    isTypeTextToolUseBlock(block) === true ||
    isPressKeysToolUseBlock(block) === true
  ) {
    return TypeCursorIcon;
  }

  if (isPasteTextToolUseBlock(block) === true) {
    return FilePasteIcon;
  }

  if (
    isMoveMouseToolUseBlock(block) === true ||
    isScrollToolUseBlock(block) === true ||
    isCursorPositionToolUseBlock(block) === true ||
    isClickMouseToolUseBlock(block) === true ||
    isDragMouseToolUseBlock(block) === true ||
    isPressMouseToolUseBlock(block) === true ||
    isTraceMouseToolUseBlock(block) === true
  ) {
    // Safe access to input property with type assertion
    const mouseBlock = block as
      | ClickMouseToolUseBlock
      | PressMouseToolUseBlock
      | DragMouseToolUseBlock;
    if (
      mouseBlock.input &&
      typeof mouseBlock.input === "object" &&
      "button" in mouseBlock.input &&
      mouseBlock.input.button === "right"
    ) {
      return MouseRightClick06Icon;
    }

    return Cursor02Icon;
  }

  if (isApplicationToolUseBlock(block) === true) {
    return BrowserIcon;
  }

  if (isReadFileToolUseBlock(block) === true) {
    return FileIcon;
  }

  return User03Icon;
}

export function getLabel(block: ComputerToolUseContentBlock): string {
  if (isScreenshotToolUseBlock(block) === true) {
    return "Screenshot";
  }

  if (isWaitToolUseBlock(block) === true) {
    return "Wait";
  }

  if (isTypeKeysToolUseBlock(block) === true) {
    return "Keys";
  }

  if (isTypeTextToolUseBlock(block) === true) {
    return "Type";
  }

  if (isPasteTextToolUseBlock(block) === true) {
    return "Paste";
  }

  if (isPressKeysToolUseBlock(block) === true) {
    return "Press Keys";
  }

  if (isMoveMouseToolUseBlock(block) === true) {
    return "Move Mouse";
  }

  if (isScrollToolUseBlock(block) === true) {
    return "Scroll";
  }

  if (isCursorPositionToolUseBlock(block) === true) {
    return "Cursor Position";
  }

  if (isClickMouseToolUseBlock(block) === true) {
    // Safe access with proper type assertion and null checks
    const clickBlock = block as ClickMouseToolUseBlock;
    if (clickBlock.input && typeof clickBlock.input === "object") {
      const button = clickBlock.input.button;
      if (button === "left") {
        if (
          typeof clickBlock.input.clickCount === "number" &&
          clickBlock.input.clickCount === 2
        ) {
          return "Double Click";
        }

        if (
          typeof clickBlock.input.clickCount === "number" &&
          clickBlock.input.clickCount === TRIPLE_CLICK_COUNT
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

  if (isDragMouseToolUseBlock(block) === true) {
    return "Drag";
  }

  if (isPressMouseToolUseBlock(block) === true) {
    return "Press Mouse";
  }

  if (isTraceMouseToolUseBlock(block) === true) {
    return "Trace Mouse";
  }

  if (isApplicationToolUseBlock(block) === true) {
    return "Open Application";
  }

  if (isReadFileToolUseBlock(block) === true) {
    return "Read File";
  }

  return "Unknown";
}
