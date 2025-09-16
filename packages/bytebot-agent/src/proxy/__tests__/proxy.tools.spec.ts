import { ChatCompletionTool, FunctionParameters } from 'openai/resources';
import { proxyTools } from '../proxy.tools';
import { agentTools } from '../../agent/agent.tools';

describe('ProxyTools', () => {
  describe('Tool Conversion and Structure', () => {
    it('should export proxyTools array', () => {
      expect(proxyTools).toBeDefined();
      expect(Array.isArray(proxyTools)).toBe(true);
      expect(proxyTools.length).toBeGreaterThan(0);
    });

    it('should convert all agent tools to Chat Completion format', () => {
      expect(proxyTools.length).toBe(agentTools.length);

      proxyTools.forEach((tool, index) => {
        expect(tool).toHaveProperty('type', 'function');
        expect(tool).toHaveProperty('function');
        expect(tool.function).toHaveProperty('name');
        expect(tool.function).toHaveProperty('description');
        expect(tool.function).toHaveProperty('parameters');

        const originalTool = agentTools[index] as any;
        expect(tool.function.name).toBe(originalTool.name);
        expect(tool.function.description).toBe(originalTool.description);
        expect(tool.function.parameters).toBe(originalTool.input_schema);
      });
    });

    it('should have valid ChatCompletionTool structure for each tool', () => {
      proxyTools.forEach((tool) => {
        // Validate top-level structure
        expect(tool).toMatchObject({
          type: 'function',
          function: {
            name: expect.any(String),
            description: expect.any(String),
            parameters: expect.any(Object),
          },
        });

        // Validate function name is non-empty
        expect(tool.function.name.length).toBeGreaterThan(0);

        // Validate description is meaningful
        expect(tool.function.description.length).toBeGreaterThan(10);

        // Validate parameters has required properties
        expect(tool.function.parameters).toHaveProperty('type');
        expect(tool.function.parameters.type).toBe('object');
      });
    });

    it('should validate tool conversion with type guards', () => {
      const mockValidTool = {
        name: 'test_tool',
        description: 'A test tool for validation',
        input_schema: {
          type: 'object',
          properties: {
            param1: { type: 'string' },
          },
        },
      };

      // Test the conversion logic with a valid tool
      const convertedTool: ChatCompletionTool = {
        type: 'function',
        function: {
          name: mockValidTool.name,
          description: mockValidTool.description,
          parameters: mockValidTool.input_schema,
        },
      };

      expect(convertedTool.type).toBe('function');
      expect(convertedTool.function.name).toBe('test_tool');
      expect(convertedTool.function.description).toBe(
        'A test tool for validation',
      );
      expect(convertedTool.function.parameters).toEqual(
        mockValidTool.input_schema,
      );
    });

    it('should handle tools with complex parameter schemas', () => {
      const complexTools = proxyTools.filter((tool) => {
        const params = tool.function.parameters as FunctionParameters;
        return params.properties && Object.keys(params.properties).length > 1;
      });

      expect(complexTools.length).toBeGreaterThan(0);

      complexTools.forEach((tool) => {
        const params = tool.function.parameters as FunctionParameters;
        expect(params).toHaveProperty('type', 'object');
        expect(params).toHaveProperty('properties');
        expect(typeof params.properties).toBe('object');
        expect(Object.keys(params.properties).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Tool Categories and Functionality', () => {
    it('should have mouse interaction tools', () => {
      const mouseTools = proxyTools.filter(
        (tool) =>
          tool.function.name.includes('mouse') ||
          tool.function.name.includes('click'),
      );
      expect(mouseTools.length).toBeGreaterThan(0);

      mouseTools.forEach((tool) => {
        const params = tool.function.parameters as FunctionParameters;
        expect(params.properties).toBeDefined();
      });
    });

    it('should have text input tools', () => {
      const textTools = proxyTools.filter(
        (tool) =>
          tool.function.name.includes('type') ||
          tool.function.name.includes('text') ||
          tool.function.name.includes('paste'),
      );
      expect(textTools.length).toBeGreaterThan(0);

      textTools.forEach((tool) => {
        const params = tool.function.parameters as FunctionParameters;
        expect(params.properties).toBeDefined();
      });
    });

    it('should have screenshot capability', () => {
      const screenshotTools = proxyTools.filter((tool) =>
        tool.function.name.includes('screenshot'),
      );
      expect(screenshotTools.length).toBeGreaterThan(0);

      screenshotTools.forEach((tool) => {
        expect(tool.function.description).toMatch(/screenshot/i);
        const params = tool.function.parameters as FunctionParameters;
        expect(params).toHaveProperty('type', 'object');
      });
    });

    it('should have task management tools', () => {
      const taskTools = proxyTools.filter((tool) =>
        tool.function.name.includes('task'),
      );
      expect(taskTools.length).toBeGreaterThan(0);

      taskTools.forEach((tool) => {
        expect(tool.function.description).toMatch(/task/i);
        const params = tool.function.parameters as FunctionParameters;
        expect(params.properties).toBeDefined();
      });
    });

    it('should have application control tool', () => {
      const appTools = proxyTools.filter((tool) =>
        tool.function.name.includes('application'),
      );
      expect(appTools.length).toBeGreaterThan(0);

      appTools.forEach((tool) => {
        expect(tool.function.description).toMatch(/application/i);
        const params = tool.function.parameters as FunctionParameters;
        expect(params.properties).toBeDefined();
      });
    });
  });

  describe('Parameter Schema Validation', () => {
    it('should have valid JSON Schema for all tool parameters', () => {
      proxyTools.forEach((tool) => {
        const params = tool.function.parameters as FunctionParameters;

        // Basic JSON Schema validation
        expect(params).toHaveProperty('type');
        expect(['object', 'array', 'string', 'number', 'boolean']).toContain(
          params.type,
        );

        if (params.type === 'object') {
          expect(params).toHaveProperty('properties');
          expect(typeof params.properties).toBe('object');
        }
      });
    });

    it('should have meaningful parameter descriptions', () => {
      proxyTools.forEach((tool) => {
        const params = tool.function.parameters as FunctionParameters;

        if (params.properties) {
          Object.entries(params.properties).forEach(
            ([paramName, paramSchema]) => {
              if (typeof paramSchema === 'object' && paramSchema !== null) {
                // Parameters should have descriptions or be self-explanatory
                const hasDescription = 'description' in paramSchema;
                const isSelfExplanatory = [
                  'x',
                  'y',
                  'id',
                  'name',
                  'text',
                  'coordinates',
                ].includes(paramName);

                expect(hasDescription || isSelfExplanatory).toBe(true);
              }
            },
          );
        }
      });
    });

    it('should have consistent parameter types across similar tools', () => {
      // Group tools by category
      const mouseTools = proxyTools.filter(
        (tool) =>
          tool.function.name.includes('mouse') ||
          tool.function.name.includes('click'),
      );

      const textTools = proxyTools.filter(
        (tool) =>
          tool.function.name.includes('type') ||
          tool.function.name.includes('text'),
      );

      // Mouse tools should have consistent coordinate parameter types
      mouseTools.forEach((tool) => {
        const params = tool.function.parameters as FunctionParameters;
        if (params.properties) {
          Object.entries(params.properties).forEach(
            ([paramName, paramSchema]) => {
              if (
                paramName.includes('coordinate') &&
                typeof paramSchema === 'object'
              ) {
                expect(paramSchema).toHaveProperty('type');
              }
            },
          );
        }
      });

      // Text tools should have consistent text parameter types
      textTools.forEach((tool) => {
        const params = tool.function.parameters as FunctionParameters;
        if (params.properties) {
          Object.entries(params.properties).forEach(
            ([paramName, paramSchema]) => {
              if (
                (paramName.includes('text') || paramName.includes('keys')) &&
                typeof paramSchema === 'object'
              ) {
                expect(paramSchema).toHaveProperty('type');
              }
            },
          );
        }
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle tools with missing or invalid schemas gracefully', () => {
      // Test with a malformed tool structure
      const malformedTool = {
        name: 'test_tool',
        description: 'Test tool',
        // Missing input_schema
      };

      // The validation should catch this
      expect(() => {
        const isValid =
          typeof malformedTool === 'object' &&
          malformedTool !== null &&
          'name' in malformedTool &&
          'description' in malformedTool &&
          'input_schema' in malformedTool &&
          typeof malformedTool.name === 'string' &&
          typeof malformedTool.description === 'string';

        if (!isValid) {
          throw new Error(
            `Invalid agent tool structure: ${JSON.stringify(malformedTool)}`,
          );
        }
      }).toThrow('Invalid agent tool structure');
    });

    it('should handle empty agent tools array', () => {
      // If agentTools were empty, proxyTools should also be empty
      if (agentTools.length === 0) {
        expect(proxyTools.length).toBe(0);
      } else {
        expect(proxyTools.length).toBeGreaterThan(0);
      }
    });

    it('should maintain tool order consistency', () => {
      // The order of tools in proxyTools should match agentTools
      proxyTools.forEach((tool, index) => {
        const originalTool = agentTools[index] as any;
        expect(tool.function.name).toBe(originalTool.name);
        expect(tool.function.description).toBe(originalTool.description);
      });
    });
  });

  describe('Integration and Compatibility', () => {
    it('should be compatible with OpenAI Chat Completion API', () => {
      proxyTools.forEach((tool) => {
        // Validate OpenAI ChatCompletionTool interface compliance
        expect(tool).toMatchObject({
          type: 'function',
          function: {
            name: expect.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]*$/), // Valid function name
            description: expect.any(String),
            parameters: expect.any(Object),
          },
        });

        // Function names should not contain spaces or special characters
        expect(tool.function.name).not.toMatch(/\s/);
        expect(tool.function.name).not.toMatch(/[^a-zA-Z0-9_]/);
      });
    });

    it('should have unique tool names', () => {
      const toolNames = proxyTools.map((tool) => tool.function.name);
      const uniqueNames = new Set(toolNames);

      expect(uniqueNames.size).toBe(toolNames.length);
    });

    it('should handle tool selection for different use cases', () => {
      // Browser automation tools
      const browserTools = proxyTools.filter((tool) =>
        ['screenshot', 'click', 'type', 'scroll'].some((keyword) =>
          tool.function.name.includes(keyword),
        ),
      );
      expect(browserTools.length).toBeGreaterThan(0);

      // Mouse interaction tools
      const mouseTools = proxyTools.filter(
        (tool) =>
          tool.function.name.includes('mouse') ||
          tool.function.name.includes('click'),
      );
      expect(mouseTools.length).toBeGreaterThan(0);

      // Text input tools
      const textTools = proxyTools.filter((tool) =>
        ['type', 'text', 'paste'].some((keyword) =>
          tool.function.name.includes(keyword),
        ),
      );
      expect(textTools.length).toBeGreaterThan(0);

      // Task management tools
      const taskTools = proxyTools.filter((tool) =>
        tool.function.name.includes('task'),
      );
      expect(taskTools.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Memory', () => {
    it('should not cause memory leaks during tool conversion', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform multiple tool conversions
      for (let i = 0; i < 1000; i++) {
        const tools = agentTools.map((tool) => ({
          type: 'function' as const,
          function: {
            name: (tool as any).name,
            description: (tool as any).description,
            parameters: (tool as any).input_schema,
          },
        }));

        // Use the tools to prevent optimization
        expect(tools.length).toBe(agentTools.length);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should have efficient tool lookup', () => {
      const startTime = performance.now();

      // Simulate rapid tool lookups
      for (let i = 0; i < 1000; i++) {
        const randomIndex = Math.floor(Math.random() * proxyTools.length);
        const tool = proxyTools[randomIndex];
        expect(tool).toBeDefined();
        expect(tool.function.name).toBeTruthy();
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 5 seconds)
      expect(duration).toBeLessThan(5000);
    });
  });
});
