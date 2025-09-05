import { ChatCompletionTool, FunctionParameters } from 'openai/resources';
import { agentTools } from '../agent/agent.tools';

/**
 * Interface representing the structure of an Anthropic/Agent tool
 * that needs to be converted to OpenAI Chat Completion format
 */
interface AgentTool {
  name: string;
  description: string;
  input_schema: FunctionParameters;
}

/**
 * Type guard to safely validate agent tool structure
 * @param tool - Unknown object that may be an agent tool
 * @returns true if tool matches AgentTool interface
 */
function isValidAgentTool(tool: unknown): tool is AgentTool {
  if (typeof tool !== 'object' || tool === null) {
    return false;
  }

  const candidate = tool as Record<string, unknown>;

  // Check required properties exist and have correct types
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.description === 'string' &&
    typeof candidate.input_schema === 'object' &&
    candidate.input_schema !== null
  );
}

/**
 * Safely converts an agent tool to OpenAI Chat Completion tool format
 * @param agentTool - The agent tool to convert
 * @returns ChatCompletionTool or throws error if invalid
 * @throws Error if tool structure is invalid
 */
function agentToolToOpenAITool(agentTool: unknown): ChatCompletionTool {
  if (!isValidAgentTool(agentTool)) {
    throw new Error(
      `Invalid agent tool structure: ${JSON.stringify(agentTool)}`,
    );
  }

  // Now TypeScript knows agentTool is of type AgentTool
  return {
    type: 'function',
    function: {
      name: agentTool.name,
      description: agentTool.description,
      parameters: agentTool.input_schema,
      strict: true, // Enable strict parameter validation for better type safety
    },
  };
}

/**
 * Convert tool name from snake_case to camelCase
 */
function convertToCamelCase(name: string): string {
  return name
    .split('_')
    .map((part, index) => {
      if (index === 0) return part;
      if (part === 'computer') return '';
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('')
    .replace(/^computer/, '');
}

/**
 * Creates a mapped object of tools by name with proper camelCase naming
 */
const toolMap = agentTools.reduce(
  (acc, tool) => {
    // Validate and convert tool safely
    const openaiTool = agentToolToOpenAITool(tool);

    // Safe access to tool.name since we've validated the structure
    if (!isValidAgentTool(tool)) {
      throw new Error(
        `Invalid tool in agentTools array: ${JSON.stringify(tool)}`,
      );
    }

    // Generate camelCase name from tool name
    const camelCaseName = convertToCamelCase(tool.name);
    acc[camelCaseName + 'Tool'] = openaiTool;
    return acc;
  },
  {} as Record<string, ChatCompletionTool>,
);

// Export individual tools with proper names
export const moveMouseTool = toolMap.moveMouseTool;
export const traceMouseTool = toolMap.traceMouseTool;
export const clickMouseTool = toolMap.clickMouseTool;
export const pressMouseTool = toolMap.pressMouseTool;
export const dragMouseTool = toolMap.dragMouseTool;
export const scrollTool = toolMap.scrollTool;
export const typeKeysTool = toolMap.typeKeysTool;
export const pressKeysTool = toolMap.pressKeysTool;
export const typeTextTool = toolMap.typeTextTool;
export const pasteTextTool = toolMap.pasteTextTool;
export const waitTool = toolMap.waitTool;
export const screenshotTool = toolMap.screenshotTool;
export const cursorPositionTool = toolMap.cursorPositionTool;
export const setTaskStatusTool = toolMap.setTaskStatusTool;
export const createTaskTool = toolMap.createTaskTool;
export const applicationTool = toolMap.applicationTool;

// Array of all tools
export const openaiTools: ChatCompletionTool[] = agentTools.map(
  agentToolToOpenAITool,
);
