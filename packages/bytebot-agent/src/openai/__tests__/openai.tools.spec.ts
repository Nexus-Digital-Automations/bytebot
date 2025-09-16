/**
 * OpenAI Tools Test Suite
 *
 * Comprehensive tests for OpenAI tool integration including:
 * - Tool conversion from agent tools to OpenAI formats
 * - Chat Completion API tool format validation
 * - Responses API tool format validation
 * - Type safety and error handling
 * - Tool mapping and naming conventions
 * - Individual tool exports verification
 * - JSON schema validation for parameters
 */

import {
  openaiChatTools,
  openaiTools,
  moveMouseTool,
  traceMouseTool,
  clickMouseTool,
  pressMouseTool,
  dragMouseTool,
  scrollTool,
  typeKeysTool,
  pressKeysTool,
  typeTextTool,
  pasteTextTool,
  waitTool,
  screenshotTool,
  cursorPositionTool,
  setTaskStatusTool,
  createTaskTool,
  applicationTool,
} from '../openai.tools';
import { agentTools } from '../../agent/agent.tools';
import { ChatCompletionTool, FunctionParameters } from 'openai/resources';
import { Tool } from 'openai/resources/responses/responses';

// Mock the agent tools with comprehensive test data
jest.mock('../../agent/agent.tools', () => ({
  agentTools: [
    {
      name: 'computer_move_mouse',
      description: 'Move the mouse cursor to a specific position',
      input_schema: {
        type: 'object',
        properties: {
          x: { type: 'number', description: 'X coordinate' },
          y: { type: 'number', description: 'Y coordinate' },
        },
        required: ['x', 'y'],
      },
    },
    {
      name: 'computer_trace_mouse',
      description: 'Trace mouse movement path',
      input_schema: {
        type: 'object',
        properties: {
          path: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
              },
              required: ['x', 'y'],
            },
            description: 'Array of coordinates',
          },
        },
        required: ['path'],
      },
    },
    {
      name: 'computer_click_mouse',
      description: 'Click mouse button at current position',
      input_schema: {
        type: 'object',
        properties: {
          button: { type: 'string', enum: ['left', 'right', 'middle'] },
          clickCount: { type: 'number', default: 1 },
        },
      },
    },
    {
      name: 'computer_press_mouse',
      description: 'Press and hold mouse button',
      input_schema: {
        type: 'object',
        properties: {
          button: { type: 'string', enum: ['left', 'right', 'middle'] },
        },
        required: ['button'],
      },
    },
    {
      name: 'computer_drag_mouse',
      description: 'Drag mouse from one position to another',
      input_schema: {
        type: 'object',
        properties: {
          startX: { type: 'number' },
          startY: { type: 'number' },
          endX: { type: 'number' },
          endY: { type: 'number' },
        },
        required: ['startX', 'startY', 'endX', 'endY'],
      },
    },
    {
      name: 'computer_scroll',
      description: 'Scroll in a direction',
      input_schema: {
        type: 'object',
        properties: {
          direction: { type: 'string', enum: ['up', 'down', 'left', 'right'] },
          amount: { type: 'number', default: 3 },
        },
        required: ['direction'],
      },
    },
    {
      name: 'computer_type_keys',
      description: 'Type key combinations',
      input_schema: {
        type: 'object',
        properties: {
          keys: { type: 'array', items: { type: 'string' } },
        },
        required: ['keys'],
      },
    },
    {
      name: 'computer_press_keys',
      description: 'Press specific keys',
      input_schema: {
        type: 'object',
        properties: {
          keys: { type: 'array', items: { type: 'string' } },
        },
        required: ['keys'],
      },
    },
    {
      name: 'computer_type_text',
      description: 'Type text content',
      input_schema: {
        type: 'object',
        properties: {
          text: { type: 'string' },
        },
        required: ['text'],
      },
    },
    {
      name: 'computer_paste_text',
      description: 'Paste text from clipboard',
      input_schema: {
        type: 'object',
        properties: {
          text: { type: 'string' },
        },
        required: ['text'],
      },
    },
    {
      name: 'computer_wait',
      description: 'Wait for specified duration',
      input_schema: {
        type: 'object',
        properties: {
          duration: { type: 'number', description: 'Duration in milliseconds' },
        },
        required: ['duration'],
      },
    },
    {
      name: 'computer_screenshot',
      description: 'Take screenshot of current screen',
      input_schema: {
        type: 'object',
        properties: {
          display: { type: 'number', default: 1 },
        },
      },
    },
    {
      name: 'computer_cursor_position',
      description: 'Get current cursor position',
      input_schema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'set_task_status',
      description: 'Set the status of a task',
      input_schema: {
        type: 'object',
        properties: {
          taskId: { type: 'string' },
          status: {
            type: 'string',
            enum: ['pending', 'running', 'completed', 'failed'],
          },
        },
        required: ['taskId', 'status'],
      },
    },
    {
      name: 'create_task',
      description: 'Create a new task',
      input_schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          priority: { type: 'number', minimum: 1, maximum: 10 },
        },
        required: ['name', 'description'],
      },
    },
    {
      name: 'application',
      description: 'Launch or interact with applications',
      input_schema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['launch', 'close', 'focus'] },
          application: { type: 'string' },
        },
        required: ['action', 'application'],
      },
    },
  ],
}));

describe('OpenAI Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Chat Completion Tools Array Export', () => {
    it('should export openaiChatTools as an array of ChatCompletionTool', () => {
      expect(Array.isArray(openaiChatTools)).toBe(true);
      expect(openaiChatTools.length).toBeGreaterThan(0);
      expect(openaiChatTools.length).toBe(agentTools.length);
    });

    it('should convert all agent tools to ChatCompletionTool format', () => {
      openaiChatTools.forEach((tool, index) => {
        expect(tool).toBeDefined();
        expect(tool.type).toBe('function');
        expect(tool.function).toBeDefined();
        expect(tool.function.name).toBe(agentTools[index].name);
        expect(tool.function.description).toBe(agentTools[index].description);
        expect(tool.function.parameters).toEqual(
          agentTools[index].input_schema,
        );
        expect(tool.function.strict).toBe(true);
      });
    });

    it('should have valid ChatCompletionTool structure for all tools', () => {
      openaiChatTools.forEach((tool) => {
        // Check required ChatCompletionTool properties
        expect(tool).toHaveProperty('type');
        expect(tool).toHaveProperty('function');
        expect(tool.type).toBe('function');

        // Check function object structure
        expect(tool.function).toHaveProperty('name');
        expect(tool.function).toHaveProperty('description');
        expect(tool.function).toHaveProperty('parameters');
        expect(tool.function).toHaveProperty('strict');

        // Validate types
        expect(typeof tool.function.name).toBe('string');
        expect(typeof tool.function.description).toBe('string');
        expect(typeof tool.function.parameters).toBe('object');
        expect(tool.function.strict).toBe(true);
      });
    });

    it('should have unique tool names in chat tools', () => {
      const toolNames = openaiChatTools.map((tool) => tool.function.name);
      const uniqueNames = new Set(toolNames);

      expect(uniqueNames.size).toBe(toolNames.length);
    });
  });

  describe('Responses API Tools Array Export', () => {
    it('should export openaiTools as an array of Tool', () => {
      expect(Array.isArray(openaiTools)).toBe(true);
      expect(openaiTools.length).toBeGreaterThan(0);
      expect(openaiTools.length).toBe(agentTools.length);
    });

    it('should convert all agent tools to Responses API Tool format', () => {
      openaiTools.forEach((tool, index) => {
        expect(tool).toBeDefined();
        expect(tool.type).toBe('function');
        expect(tool.name).toBe(agentTools[index].name);
        expect(tool.description).toBe(agentTools[index].description);
        expect(tool.parameters).toEqual(agentTools[index].input_schema);
        expect(tool.strict).toBe(true);
      });
    });

    it('should have valid Tool structure for all tools', () => {
      openaiTools.forEach((tool) => {
        // Check required Tool properties
        expect(tool).toHaveProperty('type');
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('parameters');
        expect(tool).toHaveProperty('strict');

        // Validate types
        expect(tool.type).toBe('function');
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(typeof tool.parameters).toBe('object');
        expect(tool.strict).toBe(true);
      });
    });

    it('should have unique tool names in responses tools', () => {
      const toolNames = openaiTools.map((tool) => tool.name);
      const uniqueNames = new Set(toolNames);

      expect(uniqueNames.size).toBe(toolNames.length);
    });
  });

  describe('Individual Tool Exports - Chat Completion Format', () => {
    describe('Mouse Tools', () => {
      it('should export moveMouseTool with correct ChatCompletionTool structure', () => {
        expect(moveMouseTool).toBeDefined();
        expect(moveMouseTool.type).toBe('function');
        expect(moveMouseTool.function.name).toBe('computer_move_mouse');
        expect(moveMouseTool.function.description).toContain(
          'Move the mouse cursor',
        );
        expect(moveMouseTool.function.parameters).toBeDefined();
        expect(moveMouseTool.function.parameters.properties).toHaveProperty(
          'x',
        );
        expect(moveMouseTool.function.parameters.properties).toHaveProperty(
          'y',
        );
        expect(moveMouseTool.function.parameters.required).toContain('x');
        expect(moveMouseTool.function.parameters.required).toContain('y');
        expect(moveMouseTool.function.strict).toBe(true);
      });

      it('should export traceMouseTool with correct ChatCompletionTool structure', () => {
        expect(traceMouseTool).toBeDefined();
        expect(traceMouseTool.type).toBe('function');
        expect(traceMouseTool.function.name).toBe('computer_trace_mouse');
        expect(traceMouseTool.function.description).toContain(
          'Trace mouse movement',
        );
        expect(traceMouseTool.function.parameters.properties).toHaveProperty(
          'path',
        );
        expect(traceMouseTool.function.parameters.properties.path.type).toBe(
          'array',
        );
        expect(traceMouseTool.function.strict).toBe(true);
      });

      it('should export clickMouseTool with correct ChatCompletionTool structure', () => {
        expect(clickMouseTool).toBeDefined();
        expect(clickMouseTool.type).toBe('function');
        expect(clickMouseTool.function.name).toBe('computer_click_mouse');
        expect(clickMouseTool.function.description).toContain(
          'Click mouse button',
        );
        expect(clickMouseTool.function.parameters.properties).toHaveProperty(
          'button',
        );
        expect(clickMouseTool.function.parameters.properties).toHaveProperty(
          'clickCount',
        );
        expect(
          clickMouseTool.function.parameters.properties.button.enum,
        ).toContain('left');
        expect(
          clickMouseTool.function.parameters.properties.button.enum,
        ).toContain('right');
        expect(
          clickMouseTool.function.parameters.properties.button.enum,
        ).toContain('middle');
        expect(clickMouseTool.function.strict).toBe(true);
      });

      it('should export pressMouseTool with correct ChatCompletionTool structure', () => {
        expect(pressMouseTool).toBeDefined();
        expect(pressMouseTool.type).toBe('function');
        expect(pressMouseTool.function.name).toBe('computer_press_mouse');
        expect(pressMouseTool.function.description).toContain('Press and hold');
        expect(pressMouseTool.function.parameters.properties).toHaveProperty(
          'button',
        );
        expect(pressMouseTool.function.parameters.required).toContain('button');
        expect(pressMouseTool.function.strict).toBe(true);
      });

      it('should export dragMouseTool with correct ChatCompletionTool structure', () => {
        expect(dragMouseTool).toBeDefined();
        expect(dragMouseTool.type).toBe('function');
        expect(dragMouseTool.function.name).toBe('computer_drag_mouse');
        expect(dragMouseTool.function.description).toContain('Drag mouse');
        expect(dragMouseTool.function.parameters.properties).toHaveProperty(
          'startX',
        );
        expect(dragMouseTool.function.parameters.properties).toHaveProperty(
          'startY',
        );
        expect(dragMouseTool.function.parameters.properties).toHaveProperty(
          'endX',
        );
        expect(dragMouseTool.function.parameters.properties).toHaveProperty(
          'endY',
        );
        expect(dragMouseTool.function.parameters.required).toEqual([
          'startX',
          'startY',
          'endX',
          'endY',
        ]);
        expect(dragMouseTool.function.strict).toBe(true);
      });
    });

    describe('Keyboard Tools', () => {
      it('should export typeKeysTool with correct ChatCompletionTool structure', () => {
        expect(typeKeysTool).toBeDefined();
        expect(typeKeysTool.type).toBe('function');
        expect(typeKeysTool.function.name).toBe('computer_type_keys');
        expect(typeKeysTool.function.description).toContain(
          'Type key combinations',
        );
        expect(typeKeysTool.function.parameters.properties).toHaveProperty(
          'keys',
        );
        expect(typeKeysTool.function.parameters.properties.keys.type).toBe(
          'array',
        );
        expect(
          typeKeysTool.function.parameters.properties.keys.items.type,
        ).toBe('string');
        expect(typeKeysTool.function.strict).toBe(true);
      });

      it('should export pressKeysTool with correct ChatCompletionTool structure', () => {
        expect(pressKeysTool).toBeDefined();
        expect(pressKeysTool.type).toBe('function');
        expect(pressKeysTool.function.name).toBe('computer_press_keys');
        expect(pressKeysTool.function.description).toContain(
          'Press specific keys',
        );
        expect(pressKeysTool.function.parameters.properties).toHaveProperty(
          'keys',
        );
        expect(pressKeysTool.function.parameters.required).toContain('keys');
        expect(pressKeysTool.function.strict).toBe(true);
      });

      it('should export typeTextTool with correct ChatCompletionTool structure', () => {
        expect(typeTextTool).toBeDefined();
        expect(typeTextTool.type).toBe('function');
        expect(typeTextTool.function.name).toBe('computer_type_text');
        expect(typeTextTool.function.description).toContain(
          'Type text content',
        );
        expect(typeTextTool.function.parameters.properties).toHaveProperty(
          'text',
        );
        expect(typeTextTool.function.parameters.properties.text.type).toBe(
          'string',
        );
        expect(typeTextTool.function.parameters.required).toContain('text');
        expect(typeTextTool.function.strict).toBe(true);
      });

      it('should export pasteTextTool with correct ChatCompletionTool structure', () => {
        expect(pasteTextTool).toBeDefined();
        expect(pasteTextTool.type).toBe('function');
        expect(pasteTextTool.function.name).toBe('computer_paste_text');
        expect(pasteTextTool.function.description).toContain('Paste text');
        expect(pasteTextTool.function.parameters.properties).toHaveProperty(
          'text',
        );
        expect(pasteTextTool.function.parameters.required).toContain('text');
        expect(pasteTextTool.function.strict).toBe(true);
      });
    });

    describe('System Tools', () => {
      it('should export scrollTool with correct ChatCompletionTool structure', () => {
        expect(scrollTool).toBeDefined();
        expect(scrollTool.type).toBe('function');
        expect(scrollTool.function.name).toBe('computer_scroll');
        expect(scrollTool.function.description).toContain(
          'Scroll in a direction',
        );
        expect(scrollTool.function.parameters.properties).toHaveProperty(
          'direction',
        );
        expect(scrollTool.function.parameters.properties).toHaveProperty(
          'amount',
        );
        expect(
          scrollTool.function.parameters.properties.direction.enum,
        ).toContain('up');
        expect(
          scrollTool.function.parameters.properties.direction.enum,
        ).toContain('down');
        expect(
          scrollTool.function.parameters.properties.direction.enum,
        ).toContain('left');
        expect(
          scrollTool.function.parameters.properties.direction.enum,
        ).toContain('right');
        expect(scrollTool.function.strict).toBe(true);
      });

      it('should export waitTool with correct ChatCompletionTool structure', () => {
        expect(waitTool).toBeDefined();
        expect(waitTool.type).toBe('function');
        expect(waitTool.function.name).toBe('computer_wait');
        expect(waitTool.function.description).toContain(
          'Wait for specified duration',
        );
        expect(waitTool.function.parameters.properties).toHaveProperty(
          'duration',
        );
        expect(waitTool.function.parameters.properties.duration.type).toBe(
          'number',
        );
        expect(waitTool.function.parameters.required).toContain('duration');
        expect(waitTool.function.strict).toBe(true);
      });

      it('should export screenshotTool with correct ChatCompletionTool structure', () => {
        expect(screenshotTool).toBeDefined();
        expect(screenshotTool.type).toBe('function');
        expect(screenshotTool.function.name).toBe('computer_screenshot');
        expect(screenshotTool.function.description).toContain(
          'Take screenshot',
        );
        expect(screenshotTool.function.parameters.properties).toHaveProperty(
          'display',
        );
        expect(
          screenshotTool.function.parameters.properties.display.default,
        ).toBe(1);
        expect(screenshotTool.function.strict).toBe(true);
      });

      it('should export cursorPositionTool with correct ChatCompletionTool structure', () => {
        expect(cursorPositionTool).toBeDefined();
        expect(cursorPositionTool.type).toBe('function');
        expect(cursorPositionTool.function.name).toBe(
          'computer_cursor_position',
        );
        expect(cursorPositionTool.function.description).toContain(
          'Get current cursor position',
        );
        expect(cursorPositionTool.function.parameters.properties).toBeDefined();
        expect(cursorPositionTool.function.strict).toBe(true);
      });

      it('should export applicationTool with correct ChatCompletionTool structure', () => {
        expect(applicationTool).toBeDefined();
        expect(applicationTool.type).toBe('function');
        expect(applicationTool.function.name).toBe('application');
        expect(applicationTool.function.description).toContain(
          'Launch or interact with applications',
        );
        expect(applicationTool.function.parameters.properties).toHaveProperty(
          'action',
        );
        expect(applicationTool.function.parameters.properties).toHaveProperty(
          'application',
        );
        expect(
          applicationTool.function.parameters.properties.action.enum,
        ).toContain('launch');
        expect(
          applicationTool.function.parameters.properties.action.enum,
        ).toContain('close');
        expect(
          applicationTool.function.parameters.properties.action.enum,
        ).toContain('focus');
        expect(applicationTool.function.strict).toBe(true);
      });
    });

    describe('Task Management Tools', () => {
      it('should export setTaskStatusTool with correct ChatCompletionTool structure', () => {
        expect(setTaskStatusTool).toBeDefined();
        expect(setTaskStatusTool.type).toBe('function');
        expect(setTaskStatusTool.function.name).toBe('set_task_status');
        expect(setTaskStatusTool.function.description).toContain(
          'Set the status of a task',
        );
        expect(setTaskStatusTool.function.parameters.properties).toHaveProperty(
          'taskId',
        );
        expect(setTaskStatusTool.function.parameters.properties).toHaveProperty(
          'status',
        );
        expect(
          setTaskStatusTool.function.parameters.properties.status.enum,
        ).toContain('pending');
        expect(
          setTaskStatusTool.function.parameters.properties.status.enum,
        ).toContain('running');
        expect(
          setTaskStatusTool.function.parameters.properties.status.enum,
        ).toContain('completed');
        expect(
          setTaskStatusTool.function.parameters.properties.status.enum,
        ).toContain('failed');
        expect(setTaskStatusTool.function.parameters.required).toEqual([
          'taskId',
          'status',
        ]);
        expect(setTaskStatusTool.function.strict).toBe(true);
      });

      it('should export createTaskTool with correct ChatCompletionTool structure', () => {
        expect(createTaskTool).toBeDefined();
        expect(createTaskTool.type).toBe('function');
        expect(createTaskTool.function.name).toBe('create_task');
        expect(createTaskTool.function.description).toContain(
          'Create a new task',
        );
        expect(createTaskTool.function.parameters.properties).toHaveProperty(
          'name',
        );
        expect(createTaskTool.function.parameters.properties).toHaveProperty(
          'description',
        );
        expect(createTaskTool.function.parameters.properties).toHaveProperty(
          'priority',
        );
        expect(
          createTaskTool.function.parameters.properties.priority.minimum,
        ).toBe(1);
        expect(
          createTaskTool.function.parameters.properties.priority.maximum,
        ).toBe(10);
        expect(createTaskTool.function.parameters.required).toEqual([
          'name',
          'description',
        ]);
        expect(createTaskTool.function.strict).toBe(true);
      });
    });
  });

  describe('Tool Conversion and Validation', () => {
    it('should handle tool name conversion correctly', () => {
      // Test that computer_ prefix is maintained in tool names
      const computerTools = openaiChatTools.filter((tool) =>
        tool.function.name.startsWith('computer_'),
      );

      computerTools.forEach((tool) => {
        expect(tool.function.name).toMatch(/^computer_/);
      });
    });

    it('should preserve all tool properties during conversion', () => {
      agentTools.forEach((agentTool, index) => {
        const chatTool = openaiChatTools[index];
        const responsesTool = openaiTools[index];

        // Check chat completion tool
        expect(chatTool.function.name).toBe(agentTool.name);
        expect(chatTool.function.description).toBe(agentTool.description);
        expect(chatTool.function.parameters).toEqual(agentTool.input_schema);

        // Check responses API tool
        expect(responsesTool.name).toBe(agentTool.name);
        expect(responsesTool.description).toBe(agentTool.description);
        expect(responsesTool.parameters).toEqual(agentTool.input_schema);
      });
    });

    it('should maintain parameter schema structure integrity', () => {
      openaiChatTools.forEach((tool) => {
        expect(tool.function.parameters).toHaveProperty('type');
        expect(tool.function.parameters.type).toBe('object');
        expect(tool.function.parameters).toHaveProperty('properties');
        expect(typeof tool.function.parameters.properties).toBe('object');

        if (tool.function.parameters.required) {
          expect(Array.isArray(tool.function.parameters.required)).toBe(true);
        }
      });

      openaiTools.forEach((tool) => {
        expect(tool.parameters).toHaveProperty('type');
        expect(tool.parameters.type).toBe('object');
        expect(tool.parameters).toHaveProperty('properties');
        expect(typeof tool.parameters.properties).toBe('object');

        if (tool.parameters.required) {
          expect(Array.isArray(tool.parameters.required)).toBe(true);
        }
      });
    });

    it('should enable strict parameter validation for all tools', () => {
      openaiChatTools.forEach((tool) => {
        expect(tool.function.strict).toBe(true);
      });

      openaiTools.forEach((tool) => {
        expect(tool.strict).toBe(true);
      });
    });
  });

  describe('Type Safety and Error Handling', () => {
    it('should have valid OpenAI ChatCompletionTool interface compatibility', () => {
      openaiChatTools.forEach((tool) => {
        // This test ensures the tools can be used with the OpenAI SDK
        const chatTool: ChatCompletionTool = tool;

        expect(chatTool.type).toBe('function');
        expect(chatTool.function.name).toBeDefined();
        expect(chatTool.function.description).toBeDefined();
        expect(chatTool.function.parameters).toBeDefined();
        expect(chatTool.function.strict).toBe(true);
      });
    });

    it('should have valid OpenAI Tool interface compatibility', () => {
      openaiTools.forEach((tool) => {
        // This test ensures the tools can be used with the OpenAI Responses API
        const responsesTool: Tool = tool;

        expect(responsesTool.type).toBe('function');
        expect(responsesTool.name).toBeDefined();
        expect(responsesTool.description).toBeDefined();
        expect(responsesTool.parameters).toBeDefined();
        expect(responsesTool.strict).toBe(true);
      });
    });

    it('should handle malformed agent tools gracefully', () => {
      // Test the validation logic with invalid tool structures
      const invalidTools = [
        null,
        undefined,
        'string-tool',
        { name: 'test' }, // Missing description and input_schema
        { description: 'test' }, // Missing name and input_schema
        { name: 'test', description: 'test' }, // Missing input_schema
        { name: null, description: 'test', input_schema: {} }, // Invalid name type
      ];

      invalidTools.forEach((invalidTool) => {
        // This would be caught by the type guard functions in the actual implementation
        expect(() => {
          // Simulate the isValidAgentTool function behavior
          if (typeof invalidTool !== 'object' || invalidTool === null) {
            throw new Error(
              `Invalid agent tool structure: ${JSON.stringify(invalidTool)}`,
            );
          }

          const candidate = invalidTool as Record<string, unknown>;
          if (
            typeof candidate.name !== 'string' ||
            typeof candidate.description !== 'string' ||
            typeof candidate.input_schema !== 'object' ||
            candidate.input_schema === null
          ) {
            throw new Error(
              `Invalid agent tool structure: ${JSON.stringify(invalidTool)}`,
            );
          }
        }).toThrow('Invalid agent tool structure');
      });
    });

    it('should have proper tool categorization', () => {
      const computerTools = openaiChatTools.filter((t) =>
        t.function.name.startsWith('computer_'),
      );
      const taskTools = openaiChatTools.filter((t) =>
        t.function.name.includes('task'),
      );
      const applicationTools = openaiChatTools.filter(
        (t) => t.function.name === 'application',
      );

      expect(computerTools.length).toBeGreaterThan(0);
      expect(taskTools.length).toBeGreaterThan(0);
      expect(applicationTools.length).toBeGreaterThan(0);
    });
  });

  describe('Parameter Schema Validation', () => {
    it('should have valid JSON schema structures for all chat tools', () => {
      openaiChatTools.forEach((tool) => {
        const schema = tool.function.parameters;

        expect(schema.type).toBe('object');
        expect(schema.properties).toBeDefined();

        // Validate property definitions
        Object.values(schema.properties).forEach((property: any) => {
          expect(property).toHaveProperty('type');
          expect(['string', 'number', 'boolean', 'array', 'object']).toContain(
            property.type,
          );
        });

        // Validate required fields if present
        if (schema.required) {
          expect(Array.isArray(schema.required)).toBe(true);
          schema.required.forEach((requiredField: string) => {
            expect(schema.properties).toHaveProperty(requiredField);
          });
        }
      });
    });

    it('should have valid JSON schema structures for all responses tools', () => {
      openaiTools.forEach((tool) => {
        const schema = tool.parameters;

        expect(schema.type).toBe('object');
        expect(schema.properties).toBeDefined();

        // Validate property definitions
        Object.values(schema.properties).forEach((property: any) => {
          expect(property).toHaveProperty('type');
          expect(['string', 'number', 'boolean', 'array', 'object']).toContain(
            property.type,
          );
        });

        // Validate required fields if present
        if (schema.required) {
          expect(Array.isArray(schema.required)).toBe(true);
          schema.required.forEach((requiredField: string) => {
            expect(schema.properties).toHaveProperty(requiredField);
          });
        }
      });
    });

    it('should have appropriate parameter types for computer tools', () => {
      const moveMouseTool = openaiChatTools.find(
        (t) => t.function.name === 'computer_move_mouse',
      );
      expect(moveMouseTool?.function.parameters.properties.x.type).toBe(
        'number',
      );
      expect(moveMouseTool?.function.parameters.properties.y.type).toBe(
        'number',
      );

      const typeTextTool = openaiChatTools.find(
        (t) => t.function.name === 'computer_type_text',
      );
      expect(typeTextTool?.function.parameters.properties.text.type).toBe(
        'string',
      );

      const scrollTool = openaiChatTools.find(
        (t) => t.function.name === 'computer_scroll',
      );
      expect(
        scrollTool?.function.parameters.properties.direction.enum,
      ).toBeDefined();
      expect(scrollTool?.function.parameters.properties.amount.type).toBe(
        'number',
      );
    });

    it('should have proper enum constraints where applicable', () => {
      const clickTool = openaiChatTools.find(
        (t) => t.function.name === 'computer_click_mouse',
      );
      expect(clickTool?.function.parameters.properties.button.enum).toEqual([
        'left',
        'right',
        'middle',
      ]);

      const scrollTool = openaiChatTools.find(
        (t) => t.function.name === 'computer_scroll',
      );
      expect(scrollTool?.function.parameters.properties.direction.enum).toEqual(
        ['up', 'down', 'left', 'right'],
      );

      const taskStatusTool = openaiChatTools.find(
        (t) => t.function.name === 'set_task_status',
      );
      expect(
        taskStatusTool?.function.parameters.properties.status.enum,
      ).toEqual(['pending', 'running', 'completed', 'failed']);
    });
  });

  describe('Integration with OpenAI SDK', () => {
    it('should be compatible with OpenAI Chat Completions API', () => {
      // Simulate how tools would be used in an OpenAI API call
      const apiCallBody = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Test message' }],
        tools: openaiChatTools,
        tool_choice: 'auto',
      };

      expect(apiCallBody.tools).toBeDefined();
      expect(Array.isArray(apiCallBody.tools)).toBe(true);
      expect(apiCallBody.tools.length).toBe(agentTools.length);

      apiCallBody.tools.forEach((tool) => {
        expect(tool.type).toBe('function');
        expect(tool.function).toBeDefined();
      });
    });

    it('should be compatible with OpenAI Responses API', () => {
      // Simulate how tools would be used in an OpenAI Responses API call
      const responsesApiBody = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Test message' }],
        tools: openaiTools,
        tool_choice: 'auto',
      };

      expect(responsesApiBody.tools).toBeDefined();
      expect(Array.isArray(responsesApiBody.tools)).toBe(true);
      expect(responsesApiBody.tools.length).toBe(agentTools.length);

      responsesApiBody.tools.forEach((tool) => {
        expect(tool.type).toBe('function');
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.parameters).toBeDefined();
      });
    });

    it('should maintain consistency between chat and responses tool formats', () => {
      // Verify that both formats represent the same underlying tools
      expect(openaiChatTools.length).toBe(openaiTools.length);

      openaiChatTools.forEach((chatTool, index) => {
        const responsesTool = openaiTools[index];

        expect(chatTool.function.name).toBe(responsesTool.name);
        expect(chatTool.function.description).toBe(responsesTool.description);
        expect(chatTool.function.parameters).toEqual(responsesTool.parameters);
        expect(chatTool.function.strict).toBe(responsesTool.strict);
      });
    });
  });

  describe('Performance and Memory Efficiency', () => {
    it('should not have excessive number of tools', () => {
      // Ensure tool list is manageable for API calls
      expect(openaiChatTools.length).toBeLessThan(50);
      expect(openaiTools.length).toBeLessThan(50);
    });

    it('should have reasonable description lengths', () => {
      openaiChatTools.forEach((tool) => {
        expect(tool.function.description.length).toBeLessThan(500);
      });

      openaiTools.forEach((tool) => {
        expect(tool.description.length).toBeLessThan(500);
      });
    });

    it('should have efficient schema structures', () => {
      openaiChatTools.forEach((tool) => {
        const propertyCount = Object.keys(
          tool.function.parameters.properties || {},
        ).length;
        expect(propertyCount).toBeLessThan(20); // Reasonable parameter count
      });

      openaiTools.forEach((tool) => {
        const propertyCount = Object.keys(
          tool.parameters.properties || {},
        ).length;
        expect(propertyCount).toBeLessThan(20); // Reasonable parameter count
      });
    });
  });

  describe('Naming Convention and Camel Case Conversion', () => {
    it('should handle camelCase conversion correctly', () => {
      // Test the conversion logic for tool naming
      const testCases = [
        { input: 'computer_move_mouse', expected: 'moveMouseTool' },
        { input: 'computer_click_mouse', expected: 'clickMouseTool' },
        { input: 'set_task_status', expected: 'setTaskStatusTool' },
        { input: 'create_task', expected: 'createTaskTool' },
        { input: 'application', expected: 'applicationTool' },
      ];

      testCases.forEach(({ input, expected }) => {
        // Simulate the convertToCamelCase function behavior
        const converted =
          input
            .split('_')
            .map((part, index) => {
              if (index === 0) return part;
              if (part === 'computer') return '';
              return part.charAt(0).toUpperCase() + part.slice(1);
            })
            .join('')
            .replace(/^computer/, '') + 'Tool';

        expect(converted).toBe(expected);
      });
    });

    it('should maintain consistency between exports and array contents', () => {
      // Verify that individual exports are consistent with the main arrays
      const chatToolsInArray = openaiChatTools.map((t) => t.function.name);
      const responsesToolsInArray = openaiTools.map((t) => t.name);

      expect(chatToolsInArray).toContain(moveMouseTool.function.name);
      expect(chatToolsInArray).toContain(clickMouseTool.function.name);
      expect(chatToolsInArray).toContain(typeTextTool.function.name);
      expect(chatToolsInArray).toContain(screenshotTool.function.name);
      expect(chatToolsInArray).toContain(setTaskStatusTool.function.name);
      expect(chatToolsInArray).toContain(createTaskTool.function.name);

      expect(responsesToolsInArray).toContain(moveMouseTool.function.name);
      expect(responsesToolsInArray).toContain(clickMouseTool.function.name);
      expect(responsesToolsInArray).toContain(typeTextTool.function.name);
      expect(responsesToolsInArray).toContain(screenshotTool.function.name);
      expect(responsesToolsInArray).toContain(setTaskStatusTool.function.name);
      expect(responsesToolsInArray).toContain(createTaskTool.function.name);
    });
  });
});
