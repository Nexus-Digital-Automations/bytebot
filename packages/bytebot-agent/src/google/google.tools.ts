import { FunctionDeclaration, Type } from '@google/genai';
import { agentTools } from '../agent/agent.tools';

// Define interfaces for JSON Schema
interface JsonSchemaProperty {
  type: string;
  description?: string;
  enum?: unknown[];
  nullable?: boolean;
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}

// Type guard for JsonSchemaProperty
function isValidJsonSchema(schema: unknown): schema is JsonSchemaProperty {
  if (typeof schema !== 'object' || schema === null) return false;
  const s = schema as Record<string, unknown>;
  return typeof s.type === 'string';
}

// Define interface for agent tool
interface AgentTool {
  name: string;
  description: string;
  input_schema: JsonSchemaProperty;
}

/**
 * Converts JSON Schema type to Google Genai Type
 */
function jsonSchemaTypeToGoogleType(type: string): Type {
  switch (type) {
    case 'string':
      return Type.STRING;
    case 'number':
      return Type.NUMBER;
    case 'integer':
      return Type.INTEGER;
    case 'boolean':
      return Type.BOOLEAN;
    case 'array':
      return Type.ARRAY;
    case 'object':
      return Type.OBJECT;
    default:
      return Type.STRING;
  }
}

/**
 * Converts JSON Schema to Google Genai parameter schema
 */
function convertJsonSchemaToGoogleSchema(
  schema: unknown,
): Record<string, unknown> {
  if (!schema || !isValidJsonSchema(schema)) return {};

  const result: Record<string, unknown> = {
    type: jsonSchemaTypeToGoogleType(schema.type),
  };

  if (schema.description) {
    result.description = schema.description;
  }

  // Only include enum if the property type is string; otherwise it is invalid for Google GenAI
  if (schema.type === 'string' && schema.enum && Array.isArray(schema.enum)) {
    result.enum = schema.enum;
  }

  if (schema.nullable) {
    result.nullable = true;
  }

  if (schema.type === 'array' && schema.items) {
    result.items = convertJsonSchemaToGoogleSchema(schema.items);
  }

  if (schema.type === 'object' && schema.properties) {
    const properties: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(schema.properties)) {
      properties[key] = convertJsonSchemaToGoogleSchema(value);
    }
    result.properties = properties;
    if (schema.required) {
      result.required = schema.required;
    }
  }

  return result;
}

/**
 * Converts an agent tool definition to a Google FunctionDeclaration
 */
function agentToolToGoogleTool(agentTool: unknown): FunctionDeclaration {
  // Type guard for agent tool
  if (typeof agentTool !== 'object' || agentTool === null) {
    throw new Error('Invalid agent tool: must be an object');
  }

  const tool = agentTool as Record<string, unknown>;

  if (typeof tool.name !== 'string' || typeof tool.description !== 'string') {
    throw new Error('Invalid agent tool: name and description must be strings');
  }

  const typedTool = tool as unknown as AgentTool;
  const parameters = convertJsonSchemaToGoogleSchema(typedTool.input_schema);

  return {
    name: typedTool.name,
    description: typedTool.description,
    parameters,
  };
}

/**
 * Creates a mapped object of tools by name
 */
const toolMap = agentTools.reduce(
  (acc, tool) => {
    const googleTool = agentToolToGoogleTool(tool);
    const camelCaseName = tool.name
      .split('_')
      .map((part, index) => {
        if (index === 0) return part;
        if (part === 'computer') return '';
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join('')
      .replace(/^computer/, '');

    acc[camelCaseName + 'Tool'] = googleTool;
    return acc;
  },
  {} as Record<string, FunctionDeclaration>,
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
export const googleTools: FunctionDeclaration[] = agentTools.map(
  agentToolToGoogleTool,
);
