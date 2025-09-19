/**
 * Bytebot Agent Types and Interrupts
 *
 * @fileoverview Core agent types and interrupt classes for the Bytebot platform
 * @version 1.0.0
 * @author Bytebot Security Team
 */

/**
 * Bytebot Agent Interrupt Exception
 * Thrown when an agent operation needs to be interrupted
 */
export class BytebotAgentInterrupt extends Error {
  constructor(message = "Agent operation interrupted") {
    super(message);
    this.name = "BytebotAgentInterrupt";
  }
}

/**
 * Agent operation status
 */
export enum AgentStatus {
  _IDLE = "idle",
  _PROCESSING = "processing",
  _INTERRUPTED = "interrupted",
  _ERROR = "error",
  _COMPLETED = "completed",
}

/**
 * Agent task interface compatible with Prisma Task model
 */
export interface AgentTask {
  id: string;
  description: string;
  status:
    | "PENDING"
    | "RUNNING"
    | "NEEDS_HELP"
    | "NEEDS_REVIEW"
    | "COMPLETED"
    | "CANCELLED"
    | "FAILED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  createdAt: Date;
  updatedAt: Date;
  // Optional fields from Prisma model
  type?: "IMMEDIATE" | "SCHEDULED";
  control?: "USER" | "ASSISTANT";
  createdBy?: "USER" | "ASSISTANT";
  scheduledFor?: Date | null;
  executedAt?: Date | null;
  completedAt?: Date | null;
  queuedAt?: Date | null;
  error?: string | null;
  result?: unknown;
  model?: unknown;
}

/**
 * Agent response interface
 */
export interface AgentResponse {
  id: string;
  status: AgentStatus;
  message?: string;
  data?: unknown;
  timestamp: Date;
}
