import { ChatCompletionTool, FunctionParameters } from 'openai/resources';
import { agentTools } from '../agent/agent.tools';

/**
 * Interface for agent tool structure
 */
interface AgentTool {
  name: string;
  description: string;
  input_schema: FunctionParameters;
}

/**
 * Type guard to validate agent tool structure
 */
function isValidAgentTool(tool: unknown): tool is AgentTool {
  return (
    typeof tool === 'object' &&
    tool !== null &&
    'name' in tool &&
    'description' in tool &&
    'input_schema' in tool &&
    typeof (tool as AgentTool).name === 'string' &&
    typeof (tool as AgentTool).description === 'string' &&
    typeof (tool as AgentTool).input_schema === 'object' &&
    (tool as AgentTool).input_schema !== null
  );
}

/**
 * Converts an agent tool definition to OpenAI Chat Completion tool format
 */
function agentToolToChatCompletionTool(
  agentTool: AgentTool,
): ChatCompletionTool {
  // Validate tool structure at runtime for additional safety
  if (!isValidAgentTool(agentTool)) {
    throw new Error(
      `Invalid agent tool structure: ${JSON.stringify(agentTool)}`,
    );
  }

  return {
    type: 'function',
    function: {
      name: agentTool.name,
      description: agentTool.description,
      parameters: agentTool.input_schema,
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
 * All tools converted to Chat Completion format
 */
export const proxyTools: ChatCompletionTool[] = agentTools.map((tool) =>
  agentToolToChatCompletionTool(tool as AgentTool),
);

/**
 * Individual tool exports for selective usage
 */
const toolMap = agentTools.reduce(
  (acc, tool) => {
    const agentTool = tool as AgentTool;
    const chatCompletionTool = agentToolToChatCompletionTool(agentTool);
    const camelCaseName = convertToCamelCase(agentTool.name);
    acc[camelCaseName + 'Tool'] = chatCompletionTool;
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
