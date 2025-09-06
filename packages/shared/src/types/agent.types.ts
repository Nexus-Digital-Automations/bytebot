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
  IDLE = "idle",
  PROCESSING = "processing",
  INTERRUPTED = "interrupted",
  ERROR = "error",
  COMPLETED = "completed",
}

/**
 * Agent response interface
 */
export interface AgentResponse {
  id: string;
  status: AgentStatus;
  message?: string;
  data?: any;
  timestamp: Date;
}
