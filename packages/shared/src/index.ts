/**
 * Default exports for @bytebot/shared package
 *
 * By default, we export client-safe components to prevent browser
 * build issues. For server-specific components, use:
 * import {...} from "@bytebot/shared/server"
 */

// Export client-safe components by default
export * from "./index-client";

// Export parlant types directly for easier access
export * from "./types/parlant.types";
export * from "./types/parlant-integration.types";

// Note: For server-specific components (NestJS interceptors, services, etc.)
// use the server entry point:
// import { CriticalAreaSanitizationInterceptor } from "@bytebot/shared/server"
