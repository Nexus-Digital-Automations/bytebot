/**
 * UI Constants - Centralized magic numbers for consistent UI behavior
 *
 * This file contains all magic numbers extracted to resolve ESLint no-magic-numbers violations
 * while maintaining clear, semantic naming conventions.
 *
 * @author Claude Code - Magic Numbers Constants Specialist
 * @version 2.0.0
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
// TIMEOUT CONSTANTS
// =============================================================================

/**
 * Timeout in milliseconds for copy button feedback display (2 seconds)
 */
export const COPY_FEEDBACK_TIMEOUT_MS = 2000;

/**
 * Timeout in milliseconds for async operations (5 seconds)
 */
export const ASYNC_OPERATION_TIMEOUT_MS = 5000;

// =============================================================================
// DESKTOP & VIEWPORT DIMENSIONS
// =============================================================================

/**
 * Desktop container maximum width in pixels (standard 1280px)
 */
export const DESKTOP_MAX_WIDTH_PX = 1280;

/**
 * Desktop container maximum height in pixels (standard 960px)
 */
export const DESKTOP_MAX_HEIGHT_PX = 960;

/**
 * Mobile viewport breakpoint width in pixels
 */
export const MOBILE_BREAKPOINT_PX = 375;

/**
 * Tablet viewport breakpoint width in pixels
 */
export const TABLET_BREAKPOINT_PX = 768;

/**
 * Desktop viewport breakpoint width in pixels
 */
export const DESKTOP_BREAKPOINT_PX = 1024;

// =============================================================================
// COMPONENT SIZES
// =============================================================================

/**
 * Default task list display limit
 */
export const DEFAULT_TASK_LIST_LIMIT = 5;

/**
 * Triple click count for mouse interactions
 */
export const TRIPLE_CLICK_COUNT = 3;

/**
 * Dropdown menu side offset in pixels
 */
export const DROPDOWN_SIDE_OFFSET_PX = 4;

/**
 * Popover side offset in pixels
 */
export const POPOVER_SIDE_OFFSET_PX = 4;

/**
 * Default loader size in pixels
 */
export const DEFAULT_LOADER_SIZE_PX = 16;

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

/**
 * Performance render time threshold in milliseconds (50ms)
 */
export const PERFORMANCE_RENDER_THRESHOLD_MS = 50;

/**
 * Performance render time threshold in milliseconds (100ms) for complex components
 */
export const PERFORMANCE_RENDER_THRESHOLD_COMPLEX_MS = 100;

/**
 * Memory leak detection threshold in milliseconds (200ms)
 */
export const MEMORY_LEAK_DETECTION_THRESHOLD_MS = 200;

/**
 * Memory leak detection threshold in milliseconds (300ms) for complex operations
 */
export const MEMORY_LEAK_DETECTION_THRESHOLD_COMPLEX_MS = 300;

/**
 * Large test dataset size for performance testing
 */
export const LARGE_TEST_DATASET_SIZE = 1000;

/**
 * Performance test timeout threshold in milliseconds (500ms)
 */
export const PERFORMANCE_TEST_TIMEOUT_MS = 500;

/**
 * Pagination default page size for large lists
 */
export const PAGINATION_DEFAULT_PAGE_SIZE = 10;

/**
 * Test task creation batch size
 */
export const TEST_TASK_BATCH_SIZE = 4;

/**
 * Memory usage monitoring threshold in MB (50MB)
 */
export const MEMORY_USAGE_THRESHOLD_MB = 50;

/**
 * User interaction timeout for tests in milliseconds (50ms)
 */
export const USER_INTERACTION_TIMEOUT_MS = 50;

/**
 * Test component performance limit in milliseconds (150ms)
 */
export const TEST_COMPONENT_PERFORMANCE_LIMIT_MS = 150;

/**
 * Session expiry time in milliseconds (24 hours)
 */
export const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

// =============================================================================
// ADDITIONAL TEST CONSTANTS
// =============================================================================

/**
 * Large dataset size for performance testing (1000 items)
 */
export const LARGE_DATASET_SIZE = 1000;

/**
 * Test timeout threshold in milliseconds (500ms)
 */
export const TEST_TIMEOUT_THRESHOLD_MS = 500;
