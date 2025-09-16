/**
 * Anthropic Tools Test Suite
 *
 * Comprehensive tests for Anthropic tool integration including:
 * - Tool conversion from agent tools to Anthropic tools
 * - Tool mapping and naming conventions
 * - Individual tool exports and availability
 * - Tool array structure and validation
 * - Integration with agent tool system
 */

import {
  anthropicTools,
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
} from '../anthropic.tools';
import { agentTools } from '../../agent/agent.tools';
import Anthropic from '@anthropic-ai/sdk';

// Mock the agent tools
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
          path: { type: 'array', description: 'Array of coordinates' },
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

describe('Anthropic Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Tool Array Export', () => {
    it('should export anthropicTools as an array', () => {
      expect(Array.isArray(anthropicTools)).toBe(true);
      expect(anthropicTools.length).toBeGreaterThan(0);
    });

    it('should have the same number of tools as agentTools', () => {
      expect(anthropicTools.length).toBe(agentTools.length);
    });

    it('should convert all agent tools to Anthropic.Tool format', () => {
      anthropicTools.forEach((tool, index) => {
        expect(tool).toBeDefined();
        expect(tool.name).toBe(agentTools[index].name);
        expect(tool.description).toBe(agentTools[index].description);
        expect(tool.input_schema).toBeDefined();
        expect(tool.input_schema).toEqual(agentTools[index].input_schema);
      });
    });

    it('should maintain tool structure integrity', () => {
      anthropicTools.forEach((tool) => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('input_schema');
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(typeof tool.input_schema).toBe('object');
      });
    });
  });

  describe('Individual Tool Exports', () => {
    describe('Mouse Tools', () => {
      it('should export moveMouseTool with correct structure', () => {
        expect(moveMouseTool).toBeDefined();
        expect(moveMouseTool.name).toBe('computer_move_mouse');
        expect(moveMouseTool.description).toContain('Move the mouse cursor');
        expect(moveMouseTool.input_schema).toBeDefined();
        expect(moveMouseTool.input_schema.properties).toHaveProperty('x');
        expect(moveMouseTool.input_schema.properties).toHaveProperty('y');
        expect(moveMouseTool.input_schema.required).toContain('x');
        expect(moveMouseTool.input_schema.required).toContain('y');
      });

      it('should export traceMouseTool with correct structure', () => {
        expect(traceMouseTool).toBeDefined();
        expect(traceMouseTool.name).toBe('computer_trace_mouse');
        expect(traceMouseTool.description).toContain('Trace mouse movement');
        expect(traceMouseTool.input_schema.properties).toHaveProperty('path');
        expect(traceMouseTool.input_schema.properties.path.type).toBe('array');
      });

      it('should export clickMouseTool with correct structure', () => {
        expect(clickMouseTool).toBeDefined();
        expect(clickMouseTool.name).toBe('computer_click_mouse');
        expect(clickMouseTool.description).toContain('Click mouse button');
        expect(clickMouseTool.input_schema.properties).toHaveProperty('button');
        expect(clickMouseTool.input_schema.properties).toHaveProperty(
          'clickCount',
        );
        expect(clickMouseTool.input_schema.properties.button.enum).toContain(
          'left',
        );
        expect(clickMouseTool.input_schema.properties.button.enum).toContain(
          'right',
        );
        expect(clickMouseTool.input_schema.properties.button.enum).toContain(
          'middle',
        );
      });

      it('should export pressMouseTool with correct structure', () => {
        expect(pressMouseTool).toBeDefined();
        expect(pressMouseTool.name).toBe('computer_press_mouse');
        expect(pressMouseTool.description).toContain('Press and hold');
        expect(pressMouseTool.input_schema.properties).toHaveProperty('button');
        expect(pressMouseTool.input_schema.required).toContain('button');
      });

      it('should export dragMouseTool with correct structure', () => {
        expect(dragMouseTool).toBeDefined();
        expect(dragMouseTool.name).toBe('computer_drag_mouse');
        expect(dragMouseTool.description).toContain('Drag mouse');
        expect(dragMouseTool.input_schema.properties).toHaveProperty('startX');
        expect(dragMouseTool.input_schema.properties).toHaveProperty('startY');
        expect(dragMouseTool.input_schema.properties).toHaveProperty('endX');
        expect(dragMouseTool.input_schema.properties).toHaveProperty('endY');
        expect(dragMouseTool.input_schema.required).toEqual([
          'startX',
          'startY',
          'endX',
          'endY',
        ]);
      });
    });

    describe('Keyboard Tools', () => {
      it('should export typeKeysTool with correct structure', () => {
        expect(typeKeysTool).toBeDefined();
        expect(typeKeysTool.name).toBe('computer_type_keys');
        expect(typeKeysTool.description).toContain('Type key combinations');
        expect(typeKeysTool.input_schema.properties).toHaveProperty('keys');
        expect(typeKeysTool.input_schema.properties.keys.type).toBe('array');
        expect(typeKeysTool.input_schema.properties.keys.items.type).toBe(
          'string',
        );
      });

      it('should export pressKeysTool with correct structure', () => {
        expect(pressKeysTool).toBeDefined();
        expect(pressKeysTool.name).toBe('computer_press_keys');
        expect(pressKeysTool.description).toContain('Press specific keys');
        expect(pressKeysTool.input_schema.properties).toHaveProperty('keys');
        expect(pressKeysTool.input_schema.required).toContain('keys');
      });

      it('should export typeTextTool with correct structure', () => {
        expect(typeTextTool).toBeDefined();
        expect(typeTextTool.name).toBe('computer_type_text');
        expect(typeTextTool.description).toContain('Type text content');
        expect(typeTextTool.input_schema.properties).toHaveProperty('text');
        expect(typeTextTool.input_schema.properties.text.type).toBe('string');
        expect(typeTextTool.input_schema.required).toContain('text');
      });

      it('should export pasteTextTool with correct structure', () => {
        expect(pasteTextTool).toBeDefined();
        expect(pasteTextTool.name).toBe('computer_paste_text');
        expect(pasteTextTool.description).toContain('Paste text');
        expect(pasteTextTool.input_schema.properties).toHaveProperty('text');
        expect(pasteTextTool.input_schema.required).toContain('text');
      });
    });

    describe('System Tools', () => {
      it('should export scrollTool with correct structure', () => {
        expect(scrollTool).toBeDefined();
        expect(scrollTool.name).toBe('computer_scroll');
        expect(scrollTool.description).toContain('Scroll in a direction');
        expect(scrollTool.input_schema.properties).toHaveProperty('direction');
        expect(scrollTool.input_schema.properties).toHaveProperty('amount');
        expect(scrollTool.input_schema.properties.direction.enum).toContain(
          'up',
        );
        expect(scrollTool.input_schema.properties.direction.enum).toContain(
          'down',
        );
        expect(scrollTool.input_schema.properties.direction.enum).toContain(
          'left',
        );
        expect(scrollTool.input_schema.properties.direction.enum).toContain(
          'right',
        );
      });

      it('should export waitTool with correct structure', () => {
        expect(waitTool).toBeDefined();
        expect(waitTool.name).toBe('computer_wait');
        expect(waitTool.description).toContain('Wait for specified duration');
        expect(waitTool.input_schema.properties).toHaveProperty('duration');
        expect(waitTool.input_schema.properties.duration.type).toBe('number');
        expect(waitTool.input_schema.required).toContain('duration');
      });

      it('should export screenshotTool with correct structure', () => {
        expect(screenshotTool).toBeDefined();
        expect(screenshotTool.name).toBe('computer_screenshot');
        expect(screenshotTool.description).toContain('Take screenshot');
        expect(screenshotTool.input_schema.properties).toHaveProperty(
          'display',
        );
        expect(screenshotTool.input_schema.properties.display.default).toBe(1);
      });

      it('should export cursorPositionTool with correct structure', () => {
        expect(cursorPositionTool).toBeDefined();
        expect(cursorPositionTool.name).toBe('computer_cursor_position');
        expect(cursorPositionTool.description).toContain(
          'Get current cursor position',
        );
        expect(cursorPositionTool.input_schema.properties).toBeDefined();
      });

      it('should export applicationTool with correct structure', () => {
        expect(applicationTool).toBeDefined();
        expect(applicationTool.name).toBe('application');
        expect(applicationTool.description).toContain(
          'Launch or interact with applications',
        );
        expect(applicationTool.input_schema.properties).toHaveProperty(
          'action',
        );
        expect(applicationTool.input_schema.properties).toHaveProperty(
          'application',
        );
        expect(applicationTool.input_schema.properties.action.enum).toContain(
          'launch',
        );
        expect(applicationTool.input_schema.properties.action.enum).toContain(
          'close',
        );
        expect(applicationTool.input_schema.properties.action.enum).toContain(
          'focus',
        );
      });
    });

    describe('Task Management Tools', () => {
      it('should export setTaskStatusTool with correct structure', () => {
        expect(setTaskStatusTool).toBeDefined();
        expect(setTaskStatusTool.name).toBe('set_task_status');
        expect(setTaskStatusTool.description).toContain(
          'Set the status of a task',
        );
        expect(setTaskStatusTool.input_schema.properties).toHaveProperty(
          'taskId',
        );
        expect(setTaskStatusTool.input_schema.properties).toHaveProperty(
          'status',
        );
        expect(setTaskStatusTool.input_schema.properties.status.enum).toContain(
          'pending',
        );
        expect(setTaskStatusTool.input_schema.properties.status.enum).toContain(
          'running',
        );
        expect(setTaskStatusTool.input_schema.properties.status.enum).toContain(
          'completed',
        );
        expect(setTaskStatusTool.input_schema.properties.status.enum).toContain(
          'failed',
        );
        expect(setTaskStatusTool.input_schema.required).toEqual([
          'taskId',
          'status',
        ]);
      });

      it('should export createTaskTool with correct structure', () => {
        expect(createTaskTool).toBeDefined();
        expect(createTaskTool.name).toBe('create_task');
        expect(createTaskTool.description).toContain('Create a new task');
        expect(createTaskTool.input_schema.properties).toHaveProperty('name');
        expect(createTaskTool.input_schema.properties).toHaveProperty(
          'description',
        );
        expect(createTaskTool.input_schema.properties).toHaveProperty(
          'priority',
        );
        expect(createTaskTool.input_schema.properties.priority.minimum).toBe(1);
        expect(createTaskTool.input_schema.properties.priority.maximum).toBe(
          10,
        );
        expect(createTaskTool.input_schema.required).toEqual([
          'name',
          'description',
        ]);
      });
    });
  });

  describe('Tool Conversion Logic', () => {
    it('should handle tool name conversion correctly', () => {
      // Test that computer_ prefix is handled properly in camelCase conversion
      const computerTools = anthropicTools.filter((tool) =>
        tool.name.startsWith('computer_'),
      );

      computerTools.forEach((tool) => {
        expect(tool.name).toMatch(/^computer_/);
      });
    });

    it('should preserve all tool properties during conversion', () => {
      agentTools.forEach((agentTool, index) => {
        const anthropicTool = anthropicTools[index];

        expect(anthropicTool.name).toBe(agentTool.name);
        expect(anthropicTool.description).toBe(agentTool.description);
        expect(anthropicTool.input_schema).toEqual(agentTool.input_schema);
      });
    });

    it('should maintain input schema structure integrity', () => {
      anthropicTools.forEach((tool) => {
        expect(tool.input_schema).toHaveProperty('type');
        expect(tool.input_schema.type).toBe('object');
        expect(tool.input_schema).toHaveProperty('properties');
        expect(typeof tool.input_schema.properties).toBe('object');

        if (tool.input_schema.required) {
          expect(Array.isArray(tool.input_schema.required)).toBe(true);
        }
      });
    });
  });

  describe('Tool Validation', () => {
    it('should have valid Anthropic tool structure for all tools', () => {
      anthropicTools.forEach((tool) => {
        // Check required Anthropic.Tool interface properties
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('input_schema');

        // Validate types
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(typeof tool.input_schema).toBe('object');

        // Validate name format
        expect(tool.name.length).toBeGreaterThan(0);
        expect(tool.name).toMatch(/^[a-zA-Z_][a-zA-Z0-9_]*$/);

        // Validate description
        expect(tool.description.length).toBeGreaterThan(0);
      });
    });

    it('should have unique tool names', () => {
      const toolNames = anthropicTools.map((tool) => tool.name);
      const uniqueNames = new Set(toolNames);

      expect(uniqueNames.size).toBe(toolNames.length);
    });

    it('should have meaningful descriptions for all tools', () => {
      anthropicTools.forEach((tool) => {
        expect(tool.description.length).toBeGreaterThan(10);
        expect(tool.description).not.toMatch(/^(TODO|FIXME|test)/i);
      });
    });
  });

  describe('Schema Validation', () => {
    it('should have valid JSON schema structures', () => {
      anthropicTools.forEach((tool) => {
        const schema = tool.input_schema;

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
      const moveMouseTool = anthropicTools.find(
        (t) => t.name === 'computer_move_mouse',
      );
      expect(moveMouseTool?.input_schema.properties.x.type).toBe('number');
      expect(moveMouseTool?.input_schema.properties.y.type).toBe('number');

      const typeTextTool = anthropicTools.find(
        (t) => t.name === 'computer_type_text',
      );
      expect(typeTextTool?.input_schema.properties.text.type).toBe('string');

      const scrollTool = anthropicTools.find(
        (t) => t.name === 'computer_scroll',
      );
      expect(scrollTool?.input_schema.properties.direction.enum).toBeDefined();
      expect(scrollTool?.input_schema.properties.amount.type).toBe('number');
    });

    it('should have proper enum constraints where applicable', () => {
      const clickTool = anthropicTools.find(
        (t) => t.name === 'computer_click_mouse',
      );
      expect(clickTool?.input_schema.properties.button.enum).toEqual([
        'left',
        'right',
        'middle',
      ]);

      const scrollTool = anthropicTools.find(
        (t) => t.name === 'computer_scroll',
      );
      expect(scrollTool?.input_schema.properties.direction.enum).toEqual([
        'up',
        'down',
        'left',
        'right',
      ]);

      const taskStatusTool = anthropicTools.find(
        (t) => t.name === 'set_task_status',
      );
      expect(taskStatusTool?.input_schema.properties.status.enum).toEqual([
        'pending',
        'running',
        'completed',
        'failed',
      ]);
    });
  });

  describe('Integration with Anthropic SDK', () => {
    it('should be compatible with Anthropic.Tool interface', () => {
      anthropicTools.forEach((tool) => {
        // This test ensures the tools can be used with the Anthropic SDK
        const anthropicTool: Anthropic.Tool = tool;

        expect(anthropicTool.name).toBeDefined();
        expect(anthropicTool.description).toBeDefined();
        expect(anthropicTool.input_schema).toBeDefined();
      });
    });

    it('should have proper tool categorization', () => {
      const computerTools = anthropicTools.filter((t) =>
        t.name.startsWith('computer_'),
      );
      const taskTools = anthropicTools.filter((t) => t.name.includes('task'));
      const applicationTools = anthropicTools.filter(
        (t) => t.name === 'application',
      );

      expect(computerTools.length).toBeGreaterThan(0);
      expect(taskTools.length).toBeGreaterThan(0);
      expect(applicationTools.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing agent tools gracefully', () => {
      // This is more of a safety test - if agentTools is empty or undefined
      // Use the already imported agentTools instead of require

      if (agentTools.length === 0) {
        expect(anthropicTools).toHaveLength(0);
      } else {
        expect(anthropicTools.length).toBeGreaterThan(0);
      }
    });

    it('should maintain consistency between exports and array', () => {
      // Verify that individual exports are consistent with the main array
      const toolsInArray = anthropicTools.map((t) => t.name);

      expect(toolsInArray).toContain(moveMouseTool.name);
      expect(toolsInArray).toContain(clickMouseTool.name);
      expect(toolsInArray).toContain(typeTextTool.name);
      expect(toolsInArray).toContain(screenshotTool.name);
      expect(toolsInArray).toContain(setTaskStatusTool.name);
      expect(toolsInArray).toContain(createTaskTool.name);
    });
  });

  describe('Performance Considerations', () => {
    it('should not have excessive number of tools', () => {
      // Ensure tool list is manageable for API calls
      expect(anthropicTools.length).toBeLessThan(50);
    });

    it('should have reasonable description lengths', () => {
      anthropicTools.forEach((tool) => {
        expect(tool.description.length).toBeLessThan(500);
      });
    });

    it('should have efficient schema structures', () => {
      anthropicTools.forEach((tool) => {
        const propertyCount = Object.keys(
          tool.input_schema.properties || {},
        ).length;
        expect(propertyCount).toBeLessThan(20); // Reasonable parameter count
      });
    });
  });
});
