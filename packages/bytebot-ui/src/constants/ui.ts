/**
 * UI Constants - Centralized magic numbers for consistent UI behavior
 *
 * This file contains all magic numbers extracted to resolve ESLint no-magic-numbers violations
 * while maintaining clear, semantic naming conventions.
 *
 * @author Claude Code - Magic Numbers Constants Specialist
 * @version 1.0.0
 */

// =============================================================================
// FILE UPLOAD CONSTANTS
// =============================================================================

/**
 * Maximum number of files that can be uploaded simultaneously
 */
export const MAX_FILE_UPLOAD_COUNT = 5;

/**
 * Maximum file size in megabytes for individual file uploads (30MB)
 */
export const MAX_FILE_SIZE_MB = 30;

/**
 * Maximum file size in megabytes for type validation (100MB)
 */
export const MAX_TYPE_VALIDATION_FILE_SIZE_MB = 100;

/**
 * Number of bytes in one kilobyte (1024 bytes)
 */
export const BYTES_PER_KB = 1024;

/**
 * Number of bytes in one megabyte (1024 * 1024 bytes)
 */
export const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;

// =============================================================================
// UI LAYOUT CONSTANTS
// =============================================================================

/**
 * Line height in pixels for textarea calculations
 */
export const TEXTAREA_LINE_HEIGHT_PX = 24;

/**
 * Padding in pixels for textarea height calculations
 */
export const TEXTAREA_HEIGHT_PADDING_PX = 12;

// =============================================================================
// TEST CONSTANTS
// =============================================================================

/**
 * Number of iterations for memory leak testing
 */
export const MEMORY_LEAK_TEST_ITERATIONS = 100;

/**
 * Maximum allowed memory delta in megabytes for performance tests (10MB)
 */
export const MAX_MEMORY_DELTA_MB = 10;

/**
 * Number of iterations for performance testing loops
 */
export const PERFORMANCE_TEST_ITERATIONS = 5;
