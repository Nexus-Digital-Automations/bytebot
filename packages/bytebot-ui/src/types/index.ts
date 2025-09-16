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

export interface FileWithBase64 {
  name: string;
  base64: string;
  type: string;
  size: number;
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
  files?: File[];
}

// File validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/csv',
  'application/json',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

/**
 * Enhanced file validation function with comprehensive security checks
 * Validates uploaded files for type, size, and security concerns
 * 
 * @param files - Array of FileWithBase64 objects to validate
 * @returns Array of validated FileWithBase64 objects
 */
export function validateUploadedFiles(files: FileWithBase64[]): FileWithBase64[] {
  if (!Array.isArray(files)) {
    return [];
  }

  return files.filter((file) => {
    // Check if file object has required properties
    if (!file || typeof file !== 'object') {
      return false;
    }

    if (!file.name || !file.type || !file.base64 || file.size == null) {
      return false;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE || file.size <= 0) {
      return false;
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type.toLowerCase())) {
      return false;
    }

    // Validate file name (basic security check)
    if (file.name.length > 255 || file.name.includes('../') || file.name.includes('..\\')) {
      return false;
    }

    // Validate base64 format (basic check)
    if (!file.base64.startsWith('data:') || !file.base64.includes(';base64,')) {
      return false;
    }

    return true;
  });
}
