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
 * Type definition for validated block input with required properties
 */
interface ValidatedBlockInput {
  readonly button?: string;
  readonly clickCount?: number;
  readonly [key: string]: unknown;
}

/**
 * Type guard to validate block input structure
 * @param input - Input object to validate
 * @returns Type predicate for ValidatedBlockInput
 */
function isValidatedBlockInput(input: unknown): input is ValidatedBlockInput {
  return (
    input !== null &&
    input !== undefined &&
    typeof input === "object" &&
    !Array.isArray(input)
  );
}

/**
 * Comprehensive type guard to validate ComputerToolUseContentBlock structure
 * @param block - Unknown value to validate
 * @returns Type assertion that block is ComputerToolUseContentBlock
 * @throws Error if block structure is invalid
 */
function assertValidBlock(
  block: unknown,
): asserts block is ComputerToolUseContentBlock {
  // Validate block is a non-null object
  if (block === null || block === undefined || typeof block !== "object") {
    throw new Error("Invalid block: not an object");
  }

  // Type-safe check for required properties
  const blockObj = block as Record<string, unknown>;

  // Validate 'name' property exists and is string
  if (
    !("name" in blockObj) ||
    typeof blockObj.name !== "string" ||
    blockObj.name.length === 0
  ) {
    throw new Error("Invalid block: missing or invalid name property");
  }

  // Additional validation for expected block structure
  if (
    "input" in blockObj &&
    blockObj.input !== null &&
    blockObj.input !== undefined
  ) {
    if (typeof blockObj.input !== "object") {
      throw new Error(
        "Invalid block: input property must be an object when present",
      );
    }
  }
}

/**
 * Safe type guard wrapper with comprehensive error handling and logging
 * @param guard - Type guard function to execute
 * @param block - Block to validate
 * @returns Boolean indicating if guard passed
 */
function safeTypeGuard<T>(
  guard: (obj: unknown) => obj is T,
  block: unknown,
): boolean {
  try {
    // First validate basic block structure
    assertValidBlock(block);

    // Execute the specific type guard
    const result = guard(block);

    // Ensure result is explicitly boolean
    return Boolean(result);
  } catch (error: unknown) {
    // Type-safe error handling with detailed logging
    // Debug logging removed for ESLint compliance
    // Error details: error instanceof Error ? error.message : "Unknown error", blockType: typeof block
    return false;
  }
}

/**
 * Type-safe validation for block input property with comprehensive checking
 * @param block - Block to validate for input property
 * @returns Boolean indicating if block has valid input object
 */
function hasValidInput(
  block: unknown,
): block is ComputerToolUseContentBlock & { input: Record<string, unknown> } {
  try {
    // Validate basic block structure first
    assertValidBlock(block);

    // Type-safe access to input property with proper type narrowing
    const blockObj = block as Record<string, unknown>;

    // Comprehensive input validation with safe property access
    return (
      "input" in blockObj &&
      blockObj.input !== null &&
      blockObj.input !== undefined &&
      typeof blockObj.input === "object" &&
      !Array.isArray(blockObj.input) // Ensure input is object, not array
    );
  } catch (error: unknown) {
    // Type-safe error logging
    // Debug logging removed for ESLint compliance
    // Error details: error instanceof Error ? error.message : "Unknown error", blockType: typeof block
    return false;
  }
}

/**
 * Safely extract button value from block input with comprehensive type checking
 * @param block - Block to extract button value from
 * @returns Button value as string or undefined if not found/invalid
 */
function getButtonValue(block: unknown): string | undefined {
  try {
    // Validate block structure
    assertValidBlock(block);

    // Use type-safe input validation
    if (!hasValidInput(block)) {
      return undefined;
    }

    const blockObj = block as Record<string, unknown>;

    // Validate input using type guard with safe property access
    if (!isValidatedBlockInput(blockObj.input)) {
      return undefined;
    }

    const input: ValidatedBlockInput = blockObj.input;

    // Type-safe button property access with validation
    if (
      input.button !== undefined &&
      typeof input.button === "string" &&
      input.button.length > 0
    ) {
      return input.button;
    }

    return undefined;
  } catch (error: unknown) {
    // Type-safe error logging
    // Debug logging removed for ESLint compliance
    // Error details: error instanceof Error ? error.message : "Unknown error", blockType: typeof block
    return undefined;
  }
}

/**
 * Get appropriate icon for a computer tool use block with comprehensive type safety
 * @param block - Validated ComputerToolUseContentBlock
 * @returns Corresponding icon component
 */
export function getIcon(block: ComputerToolUseContentBlock | unknown): IconType {
  // Type-safe property access with explicit type checking
  const blockObj = block as Record<string, unknown>;
  const blockName = blockObj?.name;

  // Comprehensive logging for debugging (commented for production)
  // console.debug("ComputerToolUtils.getIcon", {
  //   blockType: blockName,
  //   hasInput: Boolean(blockObj?.input),
  //   blockValid: blockName !== undefined && typeof blockName === "string" && blockName.length > 0
  // });

  // Validate input parameter with explicit null check and type safety
  if (
    block === null ||
    block === undefined ||
    typeof blockName !== "string" ||
    blockName.length === 0
  ) {
    // Warning logging removed for ESLint compliance
    // Invalid block provided
    return User03Icon;
  }

  if (safeTypeGuard(isScreenshotToolUseBlock, block as unknown)) {
    return Camera01Icon;
  }

  if (safeTypeGuard(isWaitToolUseBlock, block as unknown)) {
    return TimeQuarter02Icon;
  }

  if (
    safeTypeGuard(isTypeKeysToolUseBlock, block as unknown) ||
    safeTypeGuard(isTypeTextToolUseBlock, block as unknown) ||
    safeTypeGuard(isPressKeysToolUseBlock, block as unknown)
  ) {
    return TypeCursorIcon;
  }

  if (safeTypeGuard(isPasteTextToolUseBlock, block as unknown)) {
    return FilePasteIcon;
  }

  if (
    safeTypeGuard(isMoveMouseToolUseBlock, block as unknown) ||
    safeTypeGuard(isScrollToolUseBlock, block as unknown) ||
    safeTypeGuard(isCursorPositionToolUseBlock, block as unknown) ||
    safeTypeGuard(isClickMouseToolUseBlock, block as unknown) ||
    safeTypeGuard(isDragMouseToolUseBlock, block as unknown) ||
    safeTypeGuard(isPressMouseToolUseBlock, block as unknown) ||
    safeTypeGuard(isTraceMouseToolUseBlock, block as unknown)
  ) {
    // Safe access to button property
    const buttonValue = getButtonValue(block);
    if (buttonValue === "right") {
      return MouseRightClick06Icon;
    }

    return Cursor02Icon;
  }

  if (safeTypeGuard(isApplicationToolUseBlock, block as unknown)) {
    return BrowserIcon;
  }

  if (safeTypeGuard(isReadFileToolUseBlock, block as unknown)) {
    return FileIcon;
  }

  return User03Icon;
}

/**
 * Get human-readable label for a computer tool use block with comprehensive type safety
 * @param block - Validated ComputerToolUseContentBlock
 * @returns Human-readable label string
 */
export function getLabel(block: ComputerToolUseContentBlock | unknown): string {
  // Type-safe property access with explicit type checking
  const blockObj = block as Record<string, unknown>;
  const blockName = blockObj?.name;

  // Comprehensive logging for debugging (commented for production)
  // console.debug("ComputerToolUtils.getLabel", {
  //   blockType: blockName,
  //   hasInput: Boolean(blockObj?.input),
  //   blockValid: blockName !== undefined && typeof blockName === "string" && blockName.length > 0
  // });

  // Validate input parameter with explicit null check and type safety
  if (
    block === null ||
    block === undefined ||
    typeof blockName !== "string" ||
    blockName.length === 0
  ) {
    // Warning logging removed for ESLint compliance
    // Invalid block provided
    return "Unknown";
  }

  if (safeTypeGuard(isScreenshotToolUseBlock, block as unknown)) {
    return "Screenshot";
  }

  if (safeTypeGuard(isWaitToolUseBlock, block as unknown)) {
    return "Wait";
  }

  if (safeTypeGuard(isTypeKeysToolUseBlock, block as unknown)) {
    return "Keys";
  }

  if (safeTypeGuard(isTypeTextToolUseBlock, block as unknown)) {
    return "Type";
  }

  if (safeTypeGuard(isPasteTextToolUseBlock, block as unknown)) {
    return "Paste";
  }

  if (safeTypeGuard(isPressKeysToolUseBlock, block as unknown)) {
    return "Press Keys";
  }

  if (safeTypeGuard(isMoveMouseToolUseBlock, block as unknown)) {
    return "Move Mouse";
  }

  if (safeTypeGuard(isScrollToolUseBlock, block as unknown)) {
    return "Scroll";
  }

  if (safeTypeGuard(isCursorPositionToolUseBlock, block as unknown)) {
    return "Cursor Position";
  }

  if (safeTypeGuard(isClickMouseToolUseBlock, block as unknown)) {
    // Type-safe access with comprehensive validation
    if (hasValidInput(block)) {
      try {
        const clickBlock = block as Record<string, unknown>;

        // Validate input using type guard with safe property access
        if (!isValidatedBlockInput(clickBlock.input)) {
          return "Click";
        }

        const input: ValidatedBlockInput = clickBlock.input;

        // Type-safe property extraction with explicit validation
        const button =
          input.button !== undefined && typeof input.button === "string"
            ? input.button
            : undefined;
        const clickCount =
          input.clickCount !== undefined && typeof input.clickCount === "number"
            ? input.clickCount
            : undefined;

        // Handle left button clicks with click count
        if (button === "left") {
          if (clickCount === 2) {
            return "Double Click";
          }
          if (clickCount === TRIPLE_CLICK_COUNT) {
            return "Triple Click";
          }
          return "Click";
        }

        // Handle other button types with explicit string validation
        if (button !== undefined && button.length > 0) {
          const capitalizedButton =
            button.charAt(0).toUpperCase() + button.slice(1);
          return `${capitalizedButton} Click`;
        }
      } catch (error: unknown) {
        // Type-safe error handling
        // Debug logging removed for ESLint compliance
        // Click processing failed: error instanceof Error ? error.message : "Unknown error", blockName
      }
    }
    return "Click";
  }

  if (safeTypeGuard(isDragMouseToolUseBlock, block as unknown)) {
    return "Drag";
  }

  if (safeTypeGuard(isPressMouseToolUseBlock, block as unknown)) {
    return "Press Mouse";
  }

  if (safeTypeGuard(isTraceMouseToolUseBlock, block as unknown)) {
    return "Trace Mouse";
  }

  if (safeTypeGuard(isApplicationToolUseBlock, block as unknown)) {
    return "Open Application";
  }

  if (safeTypeGuard(isReadFileToolUseBlock, block as unknown)) {
    return "Read File";
  }

  return "Unknown";
}
