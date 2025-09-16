/**
 * OpenAI Constants Test Suite
 *
 * Comprehensive tests for OpenAI constants and model definitions including:
 * - Model configuration validation
 * - Context window specifications
 * - Default model selection
 * - Provider identification
 * - Model naming conventions
 * - Integration with agent types
 * - Performance characteristics validation
 */

import { OPENAI_MODELS, DEFAULT_MODEL } from '../openai.constants';
import { BytebotAgentModel } from '../../agent/agent.types';

describe('OpenAI Constants', () => {
  describe('OPENAI_MODELS', () => {
    it('should be defined as an array', () => {
      expect(OPENAI_MODELS).toBeDefined();
      expect(Array.isArray(OPENAI_MODELS)).toBe(true);
      expect(OPENAI_MODELS.length).toBeGreaterThan(0);
    });

    it('should contain valid BytebotAgentModel objects', () => {
      OPENAI_MODELS.forEach((model, index) => {
        expect(model).toBeDefined();
        expect(typeof model).toBe('object');

        // Check required BytebotAgentModel properties
        expect(model).toHaveProperty('provider');
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('title');
        expect(model).toHaveProperty('contextWindow');

        // Validate property types
        expect(typeof model.provider).toBe('string');
        expect(typeof model.name).toBe('string');
        expect(typeof model.title).toBe('string');
        expect(typeof model.contextWindow).toBe('number');
      });
    });

    it('should have openai as the provider for all models', () => {
      OPENAI_MODELS.forEach((model) => {
        expect(model.provider).toBe('openai');
      });
    });

    it('should have valid model names', () => {
      OPENAI_MODELS.forEach((model) => {
        expect(model.name).toBeDefined();
        expect(model.name.length).toBeGreaterThan(0);
        // OpenAI models should match expected patterns
        expect(model.name).toMatch(/^(o3|gpt-)/);
        expect(model.name).toMatch(/\d{4}-\d{2}-\d{2}$/); // Should end with date format YYYY-MM-DD
      });
    });

    it('should have meaningful model titles', () => {
      OPENAI_MODELS.forEach((model) => {
        expect(model.title).toBeDefined();
        expect(model.title.length).toBeGreaterThan(0);
        expect(model.title).toMatch(/^(o3|GPT)/);
      });
    });

    it('should have positive context window values', () => {
      OPENAI_MODELS.forEach((model) => {
        expect(model.contextWindow).toBeGreaterThan(0);
        expect(model.contextWindow).toBeLessThanOrEqual(2000000); // Reasonable upper limit for current models
      });
    });

    it('should contain expected OpenAI models', () => {
      const modelNames = OPENAI_MODELS.map((model) => model.name);

      expect(modelNames).toContain('o3-2025-04-16');
      expect(modelNames).toContain('gpt-4.1-2025-04-14');
    });

    it('should have unique model names', () => {
      const modelNames = OPENAI_MODELS.map((model) => model.name);
      const uniqueNames = new Set(modelNames);

      expect(uniqueNames.size).toBe(modelNames.length);
    });

    it('should have unique model titles', () => {
      const modelTitles = OPENAI_MODELS.map((model) => model.title);
      const uniqueTitles = new Set(modelTitles);

      expect(uniqueTitles.size).toBe(modelTitles.length);
    });

    describe('Individual Model Validation', () => {
      it('should validate o3 model', () => {
        const o3Model = OPENAI_MODELS.find(
          (model) => model.name === 'o3-2025-04-16',
        );

        expect(o3Model).toBeDefined();
        expect(o3Model?.provider).toBe('openai');
        expect(o3Model?.title).toBe('o3');
        expect(o3Model?.contextWindow).toBe(200000);
      });

      it('should validate GPT-4.1 model', () => {
        const gpt41Model = OPENAI_MODELS.find(
          (model) => model.name === 'gpt-4.1-2025-04-14',
        );

        expect(gpt41Model).toBeDefined();
        expect(gpt41Model?.provider).toBe('openai');
        expect(gpt41Model?.title).toBe('GPT-4.1');
        expect(gpt41Model?.contextWindow).toBe(1047576);
      });
    });

    describe('Context Window Specifications', () => {
      it('should have appropriate context window sizes for different model types', () => {
        const o3Model = OPENAI_MODELS.find((m) => m.name.includes('o3'));
        const gpt41Model = OPENAI_MODELS.find((m) =>
          m.name.includes('gpt-4.1'),
        );

        if (o3Model && gpt41Model) {
          expect(o3Model.contextWindow).toBeGreaterThan(100000); // o3 should have large context
          expect(gpt41Model.contextWindow).toBeGreaterThan(1000000); // GPT-4.1 should have very large context
        }
      });

      it('should have reasonable context window sizes for enterprise use', () => {
        OPENAI_MODELS.forEach((model) => {
          expect(model.contextWindow).toBeGreaterThan(100000); // Minimum for enterprise tasks
          expect(model.contextWindow).toBeLessThanOrEqual(2000000); // Current technical feasibility
        });
      });

      it('should support large document processing', () => {
        const largeContextModels = OPENAI_MODELS.filter(
          (m) => m.contextWindow >= 200000,
        );
        expect(largeContextModels.length).toBeGreaterThan(0);
      });
    });

    describe('Model Naming Conventions', () => {
      it('should follow consistent naming patterns', () => {
        OPENAI_MODELS.forEach((model) => {
          // OpenAI model naming should follow their conventions
          if (model.name.startsWith('o3')) {
            expect(model.name).toMatch(/^o3-\d{4}-\d{2}-\d{2}$/);
          } else if (model.name.startsWith('gpt-')) {
            expect(model.name).toMatch(/^gpt-\d+\.\d+-\d{4}-\d{2}-\d{2}$/);
          }
        });
      });

      it('should have valid date suffixes', () => {
        OPENAI_MODELS.forEach((model) => {
          const dateMatch = model.name.match(/(\d{4})-(\d{2})-(\d{2})$/);
          expect(dateMatch).toBeTruthy();

          if (dateMatch) {
            const year = parseInt(dateMatch[1]);
            const month = parseInt(dateMatch[2]);
            const day = parseInt(dateMatch[3]);

            expect(year).toBeGreaterThanOrEqual(2024);
            expect(year).toBeLessThanOrEqual(2030);
            expect(month).toBeGreaterThanOrEqual(1);
            expect(month).toBeLessThanOrEqual(12);
            expect(day).toBeGreaterThanOrEqual(1);
            expect(day).toBeLessThanOrEqual(31);
          }
        });
      });

      it('should have appropriate model series', () => {
        const modelSeries = OPENAI_MODELS.map((model) => {
          if (model.name.startsWith('o3')) return 'o3';
          if (model.name.startsWith('gpt-4.1')) return 'gpt-4.1';
          if (model.name.startsWith('gpt-4')) return 'gpt-4';
          return 'unknown';
        });

        expect(modelSeries).toContain('o3');
        expect(modelSeries).toContain('gpt-4.1');

        // Ensure all series are known OpenAI series
        modelSeries.forEach((series) => {
          expect(['o3', 'gpt-4.1', 'gpt-4', 'gpt-3.5']).toContain(series);
        });
      });

      it('should reflect model capabilities in naming', () => {
        const o3Models = OPENAI_MODELS.filter((m) => m.name.includes('o3'));
        const gpt4Models = OPENAI_MODELS.filter((m) =>
          m.name.includes('gpt-4'),
        );

        // o3 should be the most advanced reasoning model
        o3Models.forEach((model) => {
          expect(model.title).toContain('o3');
        });

        // GPT-4 models should indicate their version
        gpt4Models.forEach((model) => {
          expect(model.title).toContain('GPT-4');
        });
      });
    });
  });

  describe('DEFAULT_MODEL', () => {
    it('should be defined', () => {
      expect(DEFAULT_MODEL).toBeDefined();
      expect(typeof DEFAULT_MODEL).toBe('object');
    });

    it('should be one of the OPENAI_MODELS', () => {
      expect(OPENAI_MODELS).toContain(DEFAULT_MODEL);
    });

    it('should be the first model in the array', () => {
      expect(DEFAULT_MODEL).toBe(OPENAI_MODELS[0]);
    });

    it('should have valid BytebotAgentModel structure', () => {
      expect(DEFAULT_MODEL).toHaveProperty('provider');
      expect(DEFAULT_MODEL).toHaveProperty('name');
      expect(DEFAULT_MODEL).toHaveProperty('title');
      expect(DEFAULT_MODEL).toHaveProperty('contextWindow');

      expect(DEFAULT_MODEL.provider).toBe('openai');
      expect(typeof DEFAULT_MODEL.name).toBe('string');
      expect(typeof DEFAULT_MODEL.title).toBe('string');
      expect(typeof DEFAULT_MODEL.contextWindow).toBe('number');
    });

    it('should be o3 as the default', () => {
      expect(DEFAULT_MODEL.name).toBe('o3-2025-04-16');
      expect(DEFAULT_MODEL.title).toBe('o3');
      expect(DEFAULT_MODEL.contextWindow).toBe(200000);
    });

    it('should be a reasoning-capable model as default', () => {
      // o3 should be the default as it's OpenAI's most advanced reasoning model
      expect(DEFAULT_MODEL.name).toContain('o3');
      expect(DEFAULT_MODEL.title).toBe('o3');
    });

    it('should have sufficient context for complex tasks', () => {
      expect(DEFAULT_MODEL.contextWindow).toBeGreaterThan(100000);
    });
  });

  describe('Type Compatibility', () => {
    it('should be compatible with BytebotAgentModel interface', () => {
      OPENAI_MODELS.forEach((model) => {
        // TypeScript compilation would catch this, but we can test runtime behavior
        const agentModel: BytebotAgentModel = model;

        expect(agentModel.provider).toBeDefined();
        expect(agentModel.name).toBeDefined();
        expect(agentModel.title).toBeDefined();
        expect(agentModel.contextWindow).toBeDefined();
      });
    });

    it('should be assignable to BytebotAgentModel array', () => {
      const models: BytebotAgentModel[] = OPENAI_MODELS;
      expect(models.length).toBe(OPENAI_MODELS.length);
    });

    it('should support standard array operations', () => {
      // Test common array operations work correctly
      const modelNames = OPENAI_MODELS.map((m) => m.name);
      expect(modelNames.length).toBe(OPENAI_MODELS.length);

      const o3Models = OPENAI_MODELS.filter((m) => m.name.includes('o3'));
      expect(o3Models.length).toBeGreaterThan(0);

      const firstModel = OPENAI_MODELS.find((m) => m.provider === 'openai');
      expect(firstModel).toBeDefined();
    });
  });

  describe('Configuration Validation', () => {
    it('should have production-ready model specifications', () => {
      OPENAI_MODELS.forEach((model) => {
        // Check that models are properly configured for production use
        expect(model.contextWindow).toBeGreaterThan(50000); // Large enough for complex tasks
        expect(model.name).not.toContain('test'); // Not test models
        expect(model.name).not.toContain('dev'); // Not development models
        expect(model.name).not.toContain('preview'); // Not preview models
      });
    });

    it('should have appropriate model ordering', () => {
      // Models should be ordered by preference/capability
      // o3 should come first as it's the most advanced reasoning model
      expect(OPENAI_MODELS[0].name).toContain('o3');

      // Check that models are in a reasonable order
      const modelTypes = OPENAI_MODELS.map((model) => {
        if (model.name.includes('o3')) return 'o3';
        if (model.name.includes('gpt-4.1')) return 'gpt-4.1';
        if (model.name.includes('gpt-4')) return 'gpt-4';
        return 'other';
      });

      // o3 should be first
      expect(modelTypes[0]).toBe('o3');
    });

    it('should have current model versions', () => {
      OPENAI_MODELS.forEach((model) => {
        const dateMatch = model.name.match(/(\d{4})-(\d{2})-(\d{2})$/);
        if (dateMatch) {
          const year = parseInt(dateMatch[1]);

          // Models should be from 2025 (current expected versions)
          expect(year).toBeGreaterThanOrEqual(2025);
        }
      });
    });

    it('should include models suitable for different use cases', () => {
      const models = OPENAI_MODELS;

      // Should have reasoning model (o3)
      const reasoningModels = models.filter((m) => m.name.includes('o3'));
      expect(reasoningModels.length).toBeGreaterThan(0);

      // Should have general purpose models (GPT-4.x)
      const generalModels = models.filter((m) => m.name.includes('gpt-4'));
      expect(generalModels.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Characteristics', () => {
    it('should have appropriate context window distribution', () => {
      const o3Model = OPENAI_MODELS.find((m) => m.name.includes('o3'));
      const gpt41Model = OPENAI_MODELS.find((m) => m.name.includes('gpt-4.1'));

      if (o3Model && gpt41Model) {
        // o3 optimized for reasoning, may have smaller context for efficiency
        expect(o3Model.contextWindow).toBeGreaterThan(100000);

        // GPT-4.1 should have very large context for document processing
        expect(gpt41Model.contextWindow).toBeGreaterThan(1000000);
      }
    });

    it('should support enterprise-scale requirements', () => {
      OPENAI_MODELS.forEach((model) => {
        // All models should support enterprise-scale contexts
        expect(model.contextWindow).toBeGreaterThan(100000);
      });
    });

    it('should have models optimized for different tasks', () => {
      const contextSizes = OPENAI_MODELS.map((m) => m.contextWindow);
      const uniqueContextSizes = new Set(contextSizes);

      // Should have variety in context sizes for different use cases
      expect(uniqueContextSizes.size).toBeGreaterThan(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle model access safely', () => {
      // Test accessing model properties safely
      expect(() => {
        OPENAI_MODELS.forEach((model) => {
          const { provider, name, title, contextWindow } = model;
          expect(provider).toBeDefined();
          expect(name).toBeDefined();
          expect(title).toBeDefined();
          expect(contextWindow).toBeDefined();
        });
      }).not.toThrow();
    });

    it('should handle default model access safely', () => {
      expect(() => {
        const { provider, name, title, contextWindow } = DEFAULT_MODEL;
        expect(provider).toBe('openai');
        expect(name).toBeDefined();
        expect(title).toBeDefined();
        expect(contextWindow).toBeGreaterThan(0);
      }).not.toThrow();
    });

    it('should provide fallback behavior for model selection', () => {
      // If default model is not available, should have alternatives
      expect(OPENAI_MODELS.length).toBeGreaterThan(1);

      const alternatives = OPENAI_MODELS.filter((m) => m !== DEFAULT_MODEL);
      expect(alternatives.length).toBeGreaterThan(0);
    });
  });

  describe('Integration Points', () => {
    it('should be usable for model selection logic', () => {
      // Test common model selection patterns
      const modelByName = OPENAI_MODELS.find((m) => m.name === 'o3-2025-04-16');
      expect(modelByName).toBeDefined();

      const modelsBySeries = OPENAI_MODELS.filter((m) =>
        m.name.includes('gpt-4'),
      );
      expect(modelsBySeries.length).toBeGreaterThan(0);

      const highContextModels = OPENAI_MODELS.filter(
        (m) => m.contextWindow >= 1000000,
      );
      expect(highContextModels.length).toBeGreaterThan(0);
    });

    it('should provide sufficient information for API calls', () => {
      OPENAI_MODELS.forEach((model) => {
        // Each model should have enough info to make API calls
        expect(model.name).toBeDefined(); // For API model parameter
        expect(model.provider).toBe('openai'); // For service selection
        expect(model.contextWindow).toBeGreaterThan(0); // For token management
      });
    });

    it('should support model comparison and selection', () => {
      // Test that models can be compared for selection
      const sortedByContext = [...OPENAI_MODELS].sort(
        (a, b) => b.contextWindow - a.contextWindow,
      );
      expect(sortedByContext.length).toBe(OPENAI_MODELS.length);

      const sortedByName = [...OPENAI_MODELS].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      expect(sortedByName.length).toBe(OPENAI_MODELS.length);
    });

    it('should work with dynamic model selection based on requirements', () => {
      // Example: Select model based on context requirements
      const requiresLargeContext = (minContext: number) =>
        OPENAI_MODELS.filter((m) => m.contextWindow >= minContext);

      const largeContextModels = requiresLargeContext(500000);
      expect(largeContextModels.length).toBeGreaterThan(0);

      // Example: Select reasoning model
      const reasoningModels = OPENAI_MODELS.filter((m) =>
        m.name.includes('o3'),
      );
      expect(reasoningModels.length).toBeGreaterThan(0);
    });
  });

  describe('Future Compatibility', () => {
    it('should have extensible structure for new models', () => {
      // The structure should support adding new models easily
      const newModel: BytebotAgentModel = {
        provider: 'openai',
        name: 'gpt-5-2026-01-01',
        title: 'GPT-5',
        contextWindow: 2000000,
      };

      const extendedModels = [...OPENAI_MODELS, newModel];
      expect(extendedModels.length).toBe(OPENAI_MODELS.length + 1);
      expect(extendedModels[extendedModels.length - 1]).toEqual(newModel);
    });

    it('should support additional model properties without breaking', () => {
      // Test that the structure can be extended with additional properties
      const enhancedModel = {
        ...DEFAULT_MODEL,
        maxTokensPerMinute: 100000,
        costPerMillionTokens: 10.0,
        specialFeatures: ['reasoning', 'code_generation'],
      };

      // Should still work as a BytebotAgentModel
      expect(enhancedModel.provider).toBe('openai');
      expect(enhancedModel.name).toBeDefined();
      expect(enhancedModel.title).toBeDefined();
      expect(enhancedModel.contextWindow).toBeGreaterThan(0);
    });
  });
});
