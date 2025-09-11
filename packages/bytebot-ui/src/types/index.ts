import { MessageContentBlock } from "@bytebot/shared";

export enum Role {
  USER = "USER",
  ASSISTANT = "ASSISTANT",
}

// Message interface
export interface Message {
  id: string;
  content: MessageContentBlock[];
  role: Role;
  taskId?: string;
  createdAt?: string;
  take_over?: boolean;
}

// Grouped messages interface for processed endpoint
export interface GroupedMessages {
  role: Role;
  messages: Message[];
  take_over?: boolean;
}

export interface Model {
  provider: string;
  name: string;
  title: string;
}

// Task related enums and types
export enum TaskStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  NEEDS_HELP = "NEEDS_HELP",
  NEEDS_REVIEW = "NEEDS_REVIEW",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  FAILED = "FAILED",
}

export enum TaskPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

export enum TaskType {
  IMMEDIATE = "IMMEDIATE",
  SCHEDULED = "SCHEDULED",
}

export interface User {
  id: string;
  name?: string;
  email: string;
}

/**
 * Maximum file size in bytes (100MB)
 */
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

/**
 * Enhanced file upload interface with comprehensive type safety and validation
 * Used for secure file uploads with base64 encoding
 */
export interface FileWithBase64 {
  /** Original filename with extension */
  name: string;
  /** Base64 encoded file content (must include data: prefix) */
  base64: `data:${string};base64,${string}`;
  /** MIME type for file validation and security */
  type: `${string}/${string}`;
  /** File size in bytes (must be positive) */
  size: number;
  /** Optional file validation metadata */
  metadata?: {
    /** Whether file content has been validated */
    isValidated?: boolean;
    /** File upload timestamp */
    uploadedAt?: Date;
    /** Maximum allowed file size */
    maxSize?: number;
    /** Allowed MIME types for validation */
    allowedTypes?: readonly string[];
  };
}

/**
 * Type guard to validate FileWithBase64 structure and content
 * @param obj - Object to validate
 * @returns Type-safe FileWithBase64 object
 */
export function isValidFileWithBase64(obj: unknown): obj is FileWithBase64 {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  const file = obj as Record<string, unknown>;

  return (
    typeof file.name === "string" &&
    file.name.length > 0 &&
    typeof file.base64 === "string" &&
    file.base64.startsWith("data:") &&
    file.base64.includes(";base64,") &&
    typeof file.type === "string" &&
    file.type.includes("/") &&
    typeof file.size === "number" &&
    file.size > 0 &&
    file.size < MAX_FILE_SIZE_BYTES // 100MB max
  );
}

/**
 * Validates and sanitizes uploaded files for security
 * @param files - Array of file objects to validate
 * @returns Validated FileWithBase64 array
 */
export function validateUploadedFiles(files: unknown[]): FileWithBase64[] {
  return files.filter(isValidFileWithBase64).map((file) => ({
    ...file,
    name: file.name.replace(/[^a-zA-Z0-9.-]/g, "_"), // Sanitize filename
    metadata: {
      ...file.metadata,
      isValidated: true,
      uploadedAt: new Date(),
    },
  }));
}

export interface File {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string;
  createdAt: string;
  updatedAt: string;
  taskId: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  control: Role;
  createdBy: Role;
  createdAt: string;
  updatedAt: string;
  scheduledFor?: string;
  executedAt?: string;
  completedAt?: string;
  queuedAt?: string;
  error?: string;
  result?: unknown;
  model: Model;
  userId?: string;
  user?: User;
  files?: File[];
}
