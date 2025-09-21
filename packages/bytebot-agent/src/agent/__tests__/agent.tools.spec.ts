/**
 * AgentTools Unit Tests - Comprehensive Tool Schema and Definition Testing
 *
 * Production-ready unit tests covering all AgentTools functionality:
 * - Tool schema validation and structure verification
 * - Input schema definitions for all computer actions
 * - Mouse tool schemas (move, click, drag, press, scroll)
 * - Keyboard tool schemas (type keys, press keys, type text, paste text)
 * - Utility tool schemas (screenshot, cursor position, wait, application)
 * - Task management tool schemas (set status, create task)
 * - File operation tool schemas (read file)
 * - Schema property validation and required fields
 * - Tool enumeration and completeness verification
 * - Type safety and schema consistency testing
 *
 * @author Testing & Quality Assurance Specialist
 * @version 2.0.0
 * @since Phase 1: Bytebot Core Module Testing
 */

import {
  agentTools,
  _moveMouseTool,
  _traceMouseTool,
  _clickMouseTool,
  _pressMouseTool,
  _dragMouseTool,
  _scrollTool,
  _typeKeysTool,
  _pressKeysTool,
  _typeTextTool,
  _pasteTextTool,
  _waitTool,
  _screenshotTool,
  _cursorPositionTool,
  _applicationTool,
  _setTaskStatusTool,
  _createTaskTool,
  _readFileTool,
} from '../agent.tools';

describe('AgentTools', () => {
  describe('Tool Schema Validation', () => {
    it('should have correct structure for all tool definitions', () => {
      const expectedProperties = ['name', 'description', 'input_schema'];

      agentTools.forEach((tool) => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('input_schema');

        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(typeof tool.input_schema).toBe('object');

        expect(tool.name).toMatch(/^[a-z_]+$/); // Should be lowercase with underscores
        expect(tool.description.length).toBeGreaterThan(10); // Should have meaningful description
      });
    });

    it('should have valid input schemas for all tools', () => {
      agentTools.forEach((tool) => {
        const schema = tool.input_schema;

        expect(schema).toHaveProperty('type');
        expect(schema.type).toBe('object');
        expect(schema).toHaveProperty('properties');
        expect(typeof schema.properties).toBe('object');

        // Validate required fields if present
        if (schema.required) {
          expect(Array.isArray(schema.required)).toBe(true);
          schema.required.forEach((field: string) => {
            expect(schema.properties[field]).toBeDefined();
          });
        }
      });
    });

    it('should have unique tool names', () => {
      const toolNames = agentTools.map((tool) => tool.name);
      const uniqueNames = new Set(toolNames);

      expect(uniqueNames.size).toBe(toolNames.length);
    });

    it('should export the correct number of tools', () => {
      expect(agentTools).toHaveLength(17); // Verify total count

      // Verify all individual tools are included
      const expectedTools = [
        _moveMouseTool,
        _traceMouseTool,
        _clickMouseTool,
        _pressMouseTool,
        _dragMouseTool,
        _scrollTool,
        _typeKeysTool,
        _pressKeysTool,
        _typeTextTool,
        _pasteTextTool,
        _waitTool,
        _screenshotTool,
        _applicationTool,
        _cursorPositionTool,
        _setTaskStatusTool,
        _createTaskTool,
        _readFileTool,
      ];

      expectedTools.forEach((tool) => {
        expect(agentTools).toContain(tool);
      });
    });
  });

  describe('Mouse Tool Schemas', () => {
    describe('Move Mouse Tool', () => {
      it('should have correct schema structure', () => {
        expect(_moveMouseTool.name).toBe('computer_move_mouse');
        expect(_moveMouseTool.description).toBe(
          'Moves the mouse cursor to the specified coordinates',
        );

        const schema = _moveMouseTool.input_schema;
        expect(schema.type).toBe('object');
        expect(schema.required).toEqual(['coordinates']);

        const coordinates = schema.properties.coordinates;
        expect(coordinates.type).toBe('object');
        expect(coordinates.properties.x.type).toBe('number');
        expect(coordinates.properties.y.type).toBe('number');
        expect(coordinates.required).toEqual(['x', 'y']);
      });
    });

    describe('Trace Mouse Tool', () => {
      it('should have correct schema structure', () => {
        expect(_traceMouseTool.name).toBe('computer_trace_mouse');
        expect(_traceMouseTool.description).toBe(
          'Moves the mouse cursor along a specified path of coordinates',
        );

        const schema = _traceMouseTool.input_schema;
        expect(schema.required).toEqual(['path']);

        const path = schema.properties.path;
        expect(path.type).toBe('array');
        expect(path.items.type).toBe('object');
        expect(path.items.properties.x.type).toBe('number');
        expect(path.items.properties.y.type).toBe('number');

        const holdKeys = schema.properties.holdKeys;
        expect(holdKeys.type).toBe('array');
        expect(holdKeys.items.type).toBe('string');
        expect(holdKeys.nullable).toBe(true);
      });
    });

    describe('Click Mouse Tool', () => {
      it('should have correct schema structure', () => {
        expect(_clickMouseTool.name).toBe('computer_click_mouse');
        expect(_clickMouseTool.description).toBe(
          'Performs a mouse click at the specified coordinates or current position',
        );

        const schema = _clickMouseTool.input_schema;
        expect(schema.required).toEqual(['button', 'clickCount']);

        const coordinates = schema.properties.coordinates;
        expect(coordinates.nullable).toBe(true);

        const button = schema.properties.button;
        expect(button.type).toBe('string');
        expect(button.enum).toEqual(['left', 'right', 'middle']);

        const clickCount = schema.properties.clickCount;
        expect(clickCount.type).toBe('integer');
        expect(clickCount.default).toBe(1);
      });
    });

    describe('Press Mouse Tool', () => {
      it('should have correct schema structure', () => {
        expect(_pressMouseTool.name).toBe('computer_press_mouse');
        expect(_pressMouseTool.description).toBe(
          'Presses or releases a specified mouse button',
        );

        const schema = _pressMouseTool.input_schema;
        expect(schema.required).toEqual(['button', 'press']);

        const press = schema.properties.press;
        expect(press.type).toBe('string');
        expect(press.enum).toEqual(['up', 'down']);
      });
    });

    describe('Drag Mouse Tool', () => {
      it('should have correct schema structure', () => {
        expect(_dragMouseTool.name).toBe('computer_drag_mouse');
        expect(_dragMouseTool.description).toBe(
          'Drags the mouse along a path while holding a button',
        );

        const schema = _dragMouseTool.input_schema;
        expect(schema.required).toEqual(['path', 'button']);

        const path = schema.properties.path;
        expect(path.type).toBe('array');
        expect(path.items.type).toBe('object');
      });
    });

    describe('Scroll Tool', () => {
      it('should have correct schema structure', () => {
        expect(_scrollTool.name).toBe('computer_scroll');
        expect(_scrollTool.description).toBe(
          'Scrolls the mouse wheel in the specified direction',
        );

        const schema = _scrollTool.input_schema;
        expect(schema.required).toEqual([
          'coordinates',
          'direction',
          'scrollCount',
        ]);

        const direction = schema.properties.direction;
        expect(direction.type).toBe('string');
        expect(direction.enum).toEqual(['up', 'down', 'left', 'right']);

        const scrollCount = schema.properties.scrollCount;
        expect(scrollCount.type).toBe('integer');
      });
    });
  });

  describe('Keyboard Tool Schemas', () => {
    describe('Type Keys Tool', () => {
      it('should have correct schema structure', () => {
        expect(_typeKeysTool.name).toBe('computer_type_keys');
        expect(_typeKeysTool.description).toBe(
          'Types a sequence of keys (useful for keyboard shortcuts)',
        );

        const schema = _typeKeysTool.input_schema;
        expect(schema.required).toEqual(['keys']);

        const keys = schema.properties.keys;
        expect(keys.type).toBe('array');
        expect(keys.items.type).toBe('string');

        const delay = schema.properties.delay;
        expect(delay.type).toBe('number');
        expect(delay.nullable).toBe(true);
      });
    });

    describe('Press Keys Tool', () => {
      it('should have correct schema structure', () => {
        expect(_pressKeysTool.name).toBe('computer_press_keys');
        expect(_pressKeysTool.description).toBe(
          'Presses or releases specific keys (useful for holding modifiers)',
        );

        const schema = _pressKeysTool.input_schema;
        expect(schema.required).toEqual(['keys', 'press']);

        const press = schema.properties.press;
        expect(press.type).toBe('string');
        expect(press.enum).toEqual(['up', 'down']);
      });
    });

    describe('Type Text Tool', () => {
      it('should have correct schema structure', () => {
        expect(_typeTextTool.name).toBe('computer_type_text');
        expect(_typeTextTool.description).toBe(
          'Types a string of text character by character. Use this tool for strings less than 25 characters, or passwords/sensitive form fields.',
        );

        const schema = _typeTextTool.input_schema;
        expect(schema.required).toEqual(['text']);

        const text = schema.properties.text;
        expect(text.type).toBe('string');

        const isSensitive = schema.properties.isSensitive;
        expect(isSensitive.type).toBe('boolean');
        expect(isSensitive.nullable).toBe(true);
      });
    });

    describe('Paste Text Tool', () => {
      it('should have correct schema structure', () => {
        expect(_pasteTextTool.name).toBe('computer_paste_text');
        expect(_pasteTextTool.description).toBe(
          'Copies text to the clipboard and pastes it. Use this tool for typing long text strings or special characters not on the standard keyboard.',
        );

        const schema = _pasteTextTool.input_schema;
        expect(schema.required).toEqual(['text']);

        const text = schema.properties.text;
        expect(text.type).toBe('string');

        const isSensitive = schema.properties.isSensitive;
        expect(isSensitive.type).toBe('boolean');
        expect(isSensitive.nullable).toBe(true);
      });
    });
  });

  describe('Utility Tool Schemas', () => {
    describe('Wait Tool', () => {
      it('should have correct schema structure', () => {
        expect(_waitTool.name).toBe('computer_wait');
        expect(_waitTool.description).toBe(
          'Pauses execution for a specified duration',
        );

        const schema = _waitTool.input_schema;
        expect(schema.required).toEqual(['duration']);

        const duration = schema.properties.duration;
        expect(duration.type).toBe('integer');
        expect(duration.enum).toEqual([500]);
      });
    });

    describe('Screenshot Tool', () => {
      it('should have correct schema structure', () => {
        expect(_screenshotTool.name).toBe('computer_screenshot');
        expect(_screenshotTool.description).toBe(
          'Captures a screenshot of the current screen',
        );

        const schema = _screenshotTool.input_schema;
        expect(schema.type).toBe('object');
        expect(schema.properties).toEqual({});
        expect(schema.required).toBeUndefined();
      });
    });

    describe('Cursor Position Tool', () => {
      it('should have correct schema structure', () => {
        expect(_cursorPositionTool.name).toBe('computer_cursor_position');
        expect(_cursorPositionTool.description).toBe(
          'Gets the current (x, y) coordinates of the mouse cursor',
        );

        const schema = _cursorPositionTool.input_schema;
        expect(schema.type).toBe('object');
        expect(schema.properties).toEqual({});
        expect(schema.required).toBeUndefined();
      });
    });

    describe('Application Tool', () => {
      it('should have correct schema structure', () => {
        expect(_applicationTool.name).toBe('computer_application');
        expect(_applicationTool.description).toBe(
          'Opens or focuses an application and ensures it is fullscreen',
        );

        const schema = _applicationTool.input_schema;
        expect(schema.required).toEqual(['application']);

        const application = schema.properties.application;
        expect(application.type).toBe('string');
        expect(application.enum).toEqual([
          'firefox',
          '1password',
          'thunderbird',
          'vscode',
          'terminal',
          'desktop',
          'directory',
        ]);
      });
    });
  });

  describe('Task Management Tool Schemas', () => {
    describe('Set Task Status Tool', () => {
      it('should have correct schema structure', () => {
        expect(_setTaskStatusTool.name).toBe('set_task_status');
        expect(_setTaskStatusTool.description).toBe(
          'Sets the status of the current task',
        );

        const schema = _setTaskStatusTool.input_schema;
        expect(schema.required).toEqual(['status', 'description']);

        const status = schema.properties.status;
        expect(status.type).toBe('string');
        expect(status.enum).toEqual(['completed', 'needs_help']);

        const description = schema.properties.description;
        expect(description.type).toBe('string');
        expect(description.description).toBe(
          'If the task is completed, a summary of the task. If the task needs help, a description of the issue or clarification needed.',
        );
      });
    });

    describe('Create Task Tool', () => {
      it('should have correct schema structure', () => {
        expect(_createTaskTool.name).toBe('create_task');
        expect(_createTaskTool.description).toBe('Creates a new task');

        const schema = _createTaskTool.input_schema;
        expect(schema.required).toEqual(['description']);

        const description = schema.properties.description;
        expect(description.type).toBe('string');

        const type = schema.properties.type;
        expect(type.type).toBe('string');
        expect(type.enum).toEqual(['IMMEDIATE', 'SCHEDULED']);

        const scheduledFor = schema.properties.scheduledFor;
        expect(scheduledFor.type).toBe('string');
        expect(scheduledFor.format).toBe('date-time');

        const priority = schema.properties.priority;
        expect(priority.type).toBe('string');
        expect(priority.enum).toEqual(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
      });
    });
  });

  describe('File Operation Tool Schemas', () => {
    describe('Read File Tool', () => {
      it('should have correct schema structure', () => {
        expect(_readFileTool.name).toBe('computer_read_file');
        expect(_readFileTool.description).toBe(
          'Reads a file from the specified path and returns it as a document content block with base64 encoded data',
        );

        const schema = _readFileTool.input_schema;
        expect(schema.required).toEqual(['path']);

        const path = schema.properties.path;
        expect(path.type).toBe('string');
        expect(path.description).toBe('The file path to read from');
      });
    });
  });

  describe('Schema Property Validation', () => {
    it('should validate coordinate schema properties', () => {
      const coordinateTools = [
        _moveMouseTool,
        _clickMouseTool,
        _pressMouseTool,
        _scrollTool,
      ];

      coordinateTools.forEach((tool) => {
        const coordinatesProperty = tool.input_schema.properties.coordinates;
        if (coordinatesProperty) {
          expect(coordinatesProperty.type).toBe('object');
          expect(coordinatesProperty.properties.x.type).toBe('number');
          expect(coordinatesProperty.properties.y.type).toBe('number');
          expect(coordinatesProperty.required).toEqual(['x', 'y']);
        }
      });
    });

    it('should validate button schema properties', () => {
      const buttonTools = [_clickMouseTool, _pressMouseTool, _dragMouseTool];

      buttonTools.forEach((tool) => {
        const buttonProperty = tool.input_schema.properties.button;
        expect(buttonProperty.type).toBe('string');
        expect(buttonProperty.enum).toEqual(['left', 'right', 'middle']);
      });
    });

    it('should validate path schema properties', () => {
      const pathTools = [_traceMouseTool, _dragMouseTool];

      pathTools.forEach((tool) => {
        const pathProperty = tool.input_schema.properties.path;
        expect(pathProperty.type).toBe('array');
        expect(pathProperty.items.type).toBe('object');
        expect(pathProperty.items.properties.x.type).toBe('number');
        expect(pathProperty.items.properties.y.type).toBe('number');
      });
    });

    it('should validate keys schema properties', () => {
      const keyTools = [_typeKeysTool, _pressKeysTool];

      keyTools.forEach((tool) => {
        const keysProperty = tool.input_schema.properties.keys;
        expect(keysProperty.type).toBe('array');
        expect(keysProperty.items.type).toBe('string');
      });
    });

    it('should validate text schema properties', () => {
      const textTools = [_typeTextTool, _pasteTextTool];

      textTools.forEach((tool) => {
        const textProperty = tool.input_schema.properties.text;
        expect(textProperty.type).toBe('string');
      });
    });

    it('should validate holdKeys schema properties', () => {
      const holdKeysTools = [_traceMouseTool, _dragMouseTool];

      holdKeysTools.forEach((tool) => {
        const holdKeysProperty = tool.input_schema.properties.holdKeys;
        if (holdKeysProperty) {
          expect(holdKeysProperty.type).toBe('array');
          expect(holdKeysProperty.items.type).toBe('string');
          expect(holdKeysProperty.nullable).toBe(true);
        }
      });
    });
  });

  describe('Tool Categorization and Organization', () => {
    it('should categorize mouse tools correctly', () => {
      const mouseTools = [
        _moveMouseTool,
        _traceMouseTool,
        _clickMouseTool,
        _pressMouseTool,
        _dragMouseTool,
        _scrollTool,
      ];

      mouseTools.forEach((tool) => {
        expect(tool.name).toMatch(
          /^computer_(move|trace|click|press|drag|scroll)/,
        );
      });
    });

    it('should categorize keyboard tools correctly', () => {
      const keyboardTools = [
        _typeKeysTool,
        _pressKeysTool,
        _typeTextTool,
        _pasteTextTool,
      ];

      keyboardTools.forEach((tool) => {
        expect(tool.name).toMatch(/^computer_(type|press|paste)/);
      });
    });

    it('should categorize utility tools correctly', () => {
      const utilityTools = [
        _waitTool,
        _screenshotTool,
        _cursorPositionTool,
        _applicationTool,
      ];

      utilityTools.forEach((tool) => {
        expect(tool.name).toMatch(
          /^computer_(wait|screenshot|cursor_position|application)$/,
        );
      });
    });

    it('should categorize task management tools correctly', () => {
      const taskTools = [_setTaskStatusTool, _createTaskTool];

      taskTools.forEach((tool) => {
        expect(tool.name).toMatch(/^(set_task_status|create_task)$/);
      });
    });

    it('should categorize file operation tools correctly', () => {
      const fileTools = [_readFileTool];

      fileTools.forEach((tool) => {
        expect(tool.name).toMatch(/^computer_read_file$/);
      });
    });
  });

  describe('Schema Consistency and Type Safety', () => {
    it('should have consistent enum value formats', () => {
      agentTools.forEach((tool) => {
        const properties = tool.input_schema.properties;
        Object.values(properties).forEach(
          (property: Record<string, unknown>) => {
            if (property.enum) {
              expect(Array.isArray(property.enum)).toBe(true);
              property.enum.forEach((value: any) => {
                // Allow both string and number enum values (e.g., duration: [500])
                expect(['string', 'number']).toContain(typeof value);
              });
            }
          },
        );
      });
    });

    it('should have consistent nullable property usage', () => {
      agentTools.forEach((tool) => {
        const properties = tool.input_schema.properties;
        Object.values(properties).forEach(
          (property: Record<string, unknown>) => {
            if (property.nullable !== undefined) {
              expect(typeof property.nullable).toBe('boolean');
            }
          },
        );
      });
    });

    it('should have consistent type definitions', () => {
      const validTypes = [
        'object',
        'array',
        'string',
        'number',
        'integer',
        'boolean',
      ];

      agentTools.forEach((tool) => {
        const properties = tool.input_schema.properties;
        Object.values(properties).forEach(
          (property: Record<string, unknown>) => {
            expect(validTypes).toContain(property.type as string);
          },
        );
      });
    });

    it('should have meaningful descriptions for all properties', () => {
      agentTools.forEach((tool) => {
        const properties = tool.input_schema.properties;
        Object.values(properties).forEach(
          (property: Record<string, unknown>) => {
            if (property.description) {
              expect(typeof property.description).toBe('string');
              expect(property.description.length).toBeGreaterThan(5);
            }
          },
        );
      });
    });

    it('should use consistent format specifications', () => {
      agentTools.forEach((tool) => {
        const properties = tool.input_schema.properties;
        Object.values(properties).forEach(
          (property: Record<string, unknown>) => {
            if (property.format) {
              expect(typeof property.format).toBe('string');
              // Common formats should be recognized
              const validFormats = ['date-time', 'email', 'uri', 'uuid'];
              if (validFormats.includes(property.format)) {
                expect(property.type as string).toBe('string');
              }
            }
          },
        );
      });
    });
  });

  describe('Tool Enumeration Completeness', () => {
    it('should include all expected mouse action tools', () => {
      const expectedMouseTools = [
        'computer_move_mouse',
        'computer_trace_mouse',
        'computer_click_mouse',
        'computer_press_mouse',
        'computer_drag_mouse',
        'computer_scroll',
      ];

      expectedMouseTools.forEach((toolName) => {
        const tool = agentTools.find((t) => t.name === toolName);
        expect(tool).toBeDefined();
      });
    });

    it('should include all expected keyboard action tools', () => {
      const expectedKeyboardTools = [
        'computer_type_keys',
        'computer_press_keys',
        'computer_type_text',
        'computer_paste_text',
      ];

      expectedKeyboardTools.forEach((toolName) => {
        const tool = agentTools.find((t) => t.name === toolName);
        expect(tool).toBeDefined();
      });
    });

    it('should include all expected utility tools', () => {
      const expectedUtilityTools = [
        'computer_wait',
        'computer_screenshot',
        'computer_cursor_position',
        'computer_application',
      ];

      expectedUtilityTools.forEach((toolName) => {
        const tool = agentTools.find((t) => t.name === toolName);
        expect(tool).toBeDefined();
      });
    });

    it('should include all expected task management tools', () => {
      const expectedTaskTools = ['set_task_status', 'create_task'];

      expectedTaskTools.forEach((toolName) => {
        const tool = agentTools.find((t) => t.name === toolName);
        expect(tool).toBeDefined();
      });
    });

    it('should include all expected file operation tools', () => {
      const expectedFileTools = ['computer_read_file'];

      expectedFileTools.forEach((toolName) => {
        const tool = agentTools.find((t) => t.name === toolName);
        expect(tool).toBeDefined();
      });
    });

    it('should export tools in logical order', () => {
      const toolNames = agentTools.map((tool) => tool.name);

      // Mouse tools should come first
      const mouseToolStart = toolNames.indexOf('computer_move_mouse');
      const scrollToolEnd = toolNames.indexOf('computer_scroll');
      expect(mouseToolStart).toBeLessThan(scrollToolEnd);

      // Keyboard tools should follow mouse tools
      const typeKeysIndex = toolNames.indexOf('computer_type_keys');
      expect(typeKeysIndex).toBeGreaterThan(scrollToolEnd);

      // Utility tools should follow keyboard tools
      const waitToolIndex = toolNames.indexOf('computer_wait');
      const pasteTextIndex = toolNames.indexOf('computer_paste_text');
      expect(waitToolIndex).toBeGreaterThan(pasteTextIndex);
    });
  });

  describe('Schema Validation Edge Cases', () => {
    it('should handle tools with no required properties', () => {
      const toolsWithNoRequired = [_screenshotTool, _cursorPositionTool];

      toolsWithNoRequired.forEach((tool) => {
        expect(tool.input_schema.required).toBeUndefined();
        expect(Object.keys(tool.input_schema.properties)).toHaveLength(0);
      });
    });

    it('should handle tools with optional properties', () => {
      const optionalPropertyTools = [
        { tool: _typeKeysTool, optional: 'delay' },
        { tool: _typeTextTool, optional: 'delay' },
        { tool: _typeTextTool, optional: 'isSensitive' },
        { tool: _pasteTextTool, optional: 'isSensitive' },
      ];

      optionalPropertyTools.forEach(({ tool, optional }) => {
        expect(tool.input_schema.properties[optional]).toBeDefined();
        expect(tool.input_schema.required).not.toContain(optional);
      });
    });

    it('should handle complex nested object schemas', () => {
      const complexTools = [_traceMouseTool, _dragMouseTool];

      complexTools.forEach((tool) => {
        const pathProperty = tool.input_schema.properties.path;
        expect(pathProperty.type).toBe('array');
        expect(pathProperty.items.type).toBe('object');
        expect(pathProperty.items.properties).toBeDefined();
        expect(pathProperty.items.required).toEqual(['x', 'y']);
      });
    });

    it('should validate enum constraints properly', () => {
      const enumConstraints = [
        {
          tool: _clickMouseTool,
          property: 'button',
          values: ['left', 'right', 'middle'],
        },
        { tool: _pressMouseTool, property: 'press', values: ['up', 'down'] },
        {
          tool: _scrollTool,
          property: 'direction',
          values: ['up', 'down', 'left', 'right'],
        },
        {
          tool: _setTaskStatusTool,
          property: 'status',
          values: ['completed', 'needs_help'],
        },
      ];

      enumConstraints.forEach(({ tool, property, values }) => {
        const propertySchema = tool.input_schema.properties[property];
        expect(propertySchema.enum).toEqual(values);
      });
    });
  });
});
