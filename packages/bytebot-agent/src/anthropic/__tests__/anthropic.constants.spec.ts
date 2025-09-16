/**
 * Anthropic Constants Test Suite
 *
 * Comprehensive tests for Anthropic constants and model definitions including:
 * - Model configuration validation
 * - Context window specifications
 * - Default model selection
 * - Provider identification
 * - Model naming conventions
 * - Integration with agent types
 */

import { ANTHROPIC_MODELS, DEFAULT_MODEL } from '../anthropic.constants';
import { BytebotAgentModel } from '../../agent/agent.types';

describe('Anthropic Constants', () => {
  describe('ANTHROPIC_MODELS', () => {
    it('should be defined as an array', () => {
      expect(ANTHROPIC_MODELS).toBeDefined();
      expect(Array.isArray(ANTHROPIC_MODELS)).toBe(true);
      expect(ANTHROPIC_MODELS.length).toBeGreaterThan(0);
    });

    it('should contain valid BytebotAgentModel objects', () => {
      ANTHROPIC_MODELS.forEach((model, index) => {
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

    it('should have anthropic as the provider for all models', () => {
      ANTHROPIC_MODELS.forEach((model) => {
        expect(model.provider).toBe('anthropic');
      });
    });

    it('should have valid model names', () => {
      ANTHROPIC_MODELS.forEach((model) => {
        expect(model.name).toBeDefined();
        expect(model.name.length).toBeGreaterThan(0);
        expect(model.name).toMatch(/^claude-/);
        expect(model.name).toMatch(/\d{8}$/); // Should end with date format
      });
    });

    it('should have meaningful model titles', () => {
      ANTHROPIC_MODELS.forEach((model) => {
        expect(model.title).toBeDefined();
        expect(model.title.length).toBeGreaterThan(0);
        expect(model.title).toMatch(/^Claude/);
        expect(model.title).toContain('Claude');
      });
    });

    it('should have positive context window values', () => {
      ANTHROPIC_MODELS.forEach((model) => {
        expect(model.contextWindow).toBeGreaterThan(0);
        expect(model.contextWindow).toBeLessThanOrEqual(1000000); // Reasonable upper limit
      });
    });

    it('should contain expected Claude models', () => {
      const modelNames = ANTHROPIC_MODELS.map((model) => model.name);

      expect(modelNames).toContain('claude-opus-4-1-20250805');
      expect(modelNames).toContain('claude-sonnet-4-20250514');
    });

    it('should have unique model names', () => {
      const modelNames = ANTHROPIC_MODELS.map((model) => model.name);
      const uniqueNames = new Set(modelNames);

      expect(uniqueNames.size).toBe(modelNames.length);
    });

    it('should have unique model titles', () => {
      const modelTitles = ANTHROPIC_MODELS.map((model) => model.title);
      const uniqueTitles = new Set(modelTitles);

      expect(uniqueTitles.size).toBe(modelTitles.length);
    });

    describe('Individual Model Validation', () => {
      it('should validate Claude Opus 4.1 model', () => {
        const opusModel = ANTHROPIC_MODELS.find(
          (model) => model.name === 'claude-opus-4-1-20250805',
        );

        expect(opusModel).toBeDefined();
        expect(opusModel?.provider).toBe('anthropic');
        expect(opusModel?.title).toBe('Claude Opus 4.1');
        expect(opusModel?.contextWindow).toBe(200000);
      });

      it('should validate Claude Sonnet 4 model', () => {
        const sonnetModel = ANTHROPIC_MODELS.find(
          (model) => model.name === 'claude-sonnet-4-20250514',
        );

        expect(sonnetModel).toBeDefined();
        expect(sonnetModel?.provider).toBe('anthropic');
        expect(sonnetModel?.title).toBe('Claude Sonnet 4');
        expect(sonnetModel?.contextWindow).toBe(200000);
      });
    });

    describe('Context Window Specifications', () => {
      it('should have consistent context window sizes', () => {
        const contextWindows = ANTHROPIC_MODELS.map(
          (model) => model.contextWindow,
        );

        // All current models have 200k context window
        contextWindows.forEach((contextWindow) => {
          expect(contextWindow).toBe(200000);
        });
      });

      it('should have reasonable context window sizes', () => {
        ANTHROPIC_MODELS.forEach((model) => {
          expect(model.contextWindow).toBeGreaterThan(50000); // Minimum viable context
          expect(model.contextWindow).toBeLessThanOrEqual(1000000); // Current technical limits
        });
      });
    });

    describe('Model Naming Conventions', () => {
      it('should follow consistent naming patterns', () => {
        ANTHROPIC_MODELS.forEach((model) => {
          // Claude model naming: claude-{variant}-{version}-{date}
          expect(model.name).toMatch(/^claude-[a-z]+-\d+-\d{8}$/);
        });
      });

      it('should have valid date suffixes', () => {
        ANTHROPIC_MODELS.forEach((model) => {
          const dateSuffix = model.name.split('-').pop();
          expect(dateSuffix).toMatch(/^\d{8}$/);

          // Validate it's a reasonable date (after 2024)
          const year = parseInt(dateSuffix!.substring(0, 4));
          expect(year).toBeGreaterThanOrEqual(2024);
          expect(year).toBeLessThanOrEqual(2030);

          const month = parseInt(dateSuffix!.substring(4, 6));
          expect(month).toBeGreaterThanOrEqual(1);
          expect(month).toBeLessThanOrEqual(12);

          const day = parseInt(dateSuffix!.substring(6, 8));
          expect(day).toBeGreaterThanOrEqual(1);
          expect(day).toBeLessThanOrEqual(31);
        });
      });

      it('should have appropriate model variants', () => {
        const variants = ANTHROPIC_MODELS.map((model) => {
          const parts = model.name.split('-');
          return parts[1]; // Get variant (opus, sonnet, haiku, etc.)
        });

        expect(variants).toContain('opus');
        expect(variants).toContain('sonnet');

        // Ensure all variants are known Claude variants
        variants.forEach((variant) => {
          expect(['opus', 'sonnet', 'haiku']).toContain(variant);
        });
      });
    });
  });

  describe('DEFAULT_MODEL', () => {
    it('should be defined', () => {
      expect(DEFAULT_MODEL).toBeDefined();
      expect(typeof DEFAULT_MODEL).toBe('object');
    });

    it('should be one of the ANTHROPIC_MODELS', () => {
      expect(ANTHROPIC_MODELS).toContain(DEFAULT_MODEL);
    });

    it('should be the first model in the array', () => {
      expect(DEFAULT_MODEL).toBe(ANTHROPIC_MODELS[0]);
    });

    it('should have valid BytebotAgentModel structure', () => {
      expect(DEFAULT_MODEL).toHaveProperty('provider');
      expect(DEFAULT_MODEL).toHaveProperty('name');
      expect(DEFAULT_MODEL).toHaveProperty('title');
      expect(DEFAULT_MODEL).toHaveProperty('contextWindow');

      expect(DEFAULT_MODEL.provider).toBe('anthropic');
      expect(typeof DEFAULT_MODEL.name).toBe('string');
      expect(typeof DEFAULT_MODEL.title).toBe('string');
      expect(typeof DEFAULT_MODEL.contextWindow).toBe('number');
    });

    it('should be Claude Opus 4.1 as the default', () => {
      expect(DEFAULT_MODEL.name).toBe('claude-opus-4-1-20250805');
      expect(DEFAULT_MODEL.title).toBe('Claude Opus 4.1');
      expect(DEFAULT_MODEL.contextWindow).toBe(200000);
    });

    it('should have the highest capability model as default', () => {
      // Opus should be the default as it's typically the most capable
      expect(DEFAULT_MODEL.name).toContain('opus');
    });
  });

  describe('Type Compatibility', () => {
    it('should be compatible with BytebotAgentModel interface', () => {
      ANTHROPIC_MODELS.forEach((model) => {
        // TypeScript compilation would catch this, but we can test runtime behavior
        const agentModel: BytebotAgentModel = model;

        expect(agentModel.provider).toBeDefined();
        expect(agentModel.name).toBeDefined();
        expect(agentModel.title).toBeDefined();
        expect(agentModel.contextWindow).toBeDefined();
      });
    });

    it('should be assignable to BytebotAgentModel array', () => {
      const models: BytebotAgentModel[] = ANTHROPIC_MODELS;
      expect(models.length).toBe(ANTHROPIC_MODELS.length);
    });

    it('should support standard array operations', () => {
      // Test common array operations work correctly
      const modelNames = ANTHROPIC_MODELS.map((m) => m.name);
      expect(modelNames.length).toBe(ANTHROPIC_MODELS.length);

      const opusModels = ANTHROPIC_MODELS.filter((m) =>
        m.name.includes('opus'),
      );
      expect(opusModels.length).toBeGreaterThan(0);

      const firstModel = ANTHROPIC_MODELS.find(
        (m) => m.provider === 'anthropic',
      );
      expect(firstModel).toBeDefined();
    });
  });

  describe('Configuration Validation', () => {
    it('should have production-ready model specifications', () => {
      ANTHROPIC_MODELS.forEach((model) => {
        // Check that models are properly configured for production use
        expect(model.contextWindow).toBeGreaterThan(100000); // Large enough for complex tasks
        expect(model.name).not.toContain('test'); // Not test models
        expect(model.name).not.toContain('dev'); // Not development models
        expect(model.name).not.toContain('beta'); // Not beta models
      });
    });

    it('should have appropriate model ordering', () => {
      // Models should be ordered by capability/preference
      // Opus should come first as it's the most capable
      expect(ANTHROPIC_MODELS[0].name).toContain('opus');

      // Check that models are in a reasonable order
      const modelTypes = ANTHROPIC_MODELS.map((model) => {
        const parts = model.name.split('-');
        return parts[1]; // opus, sonnet, haiku
      });

      // Opus should be first
      expect(modelTypes[0]).toBe('opus');
    });

    it('should have current model versions', () => {
      ANTHROPIC_MODELS.forEach((model) => {
        const dateSuffix = model.name.split('-').pop();
        const year = parseInt(dateSuffix!.substring(0, 4));

        // Models should be from 2025 (current expected versions)
        expect(year).toBeGreaterThanOrEqual(2025);
      });
    });
  });

  describe('Performance Characteristics', () => {
    it('should have appropriate context window sizes for different model types', () => {
      const opusModel = ANTHROPIC_MODELS.find((m) => m.name.includes('opus'));
      const sonnetModel = ANTHROPIC_MODELS.find((m) =>
        m.name.includes('sonnet'),
      );

      if (opusModel && sonnetModel) {
        // Both should have large context windows for current versions
        expect(opusModel.contextWindow).toBeGreaterThanOrEqual(200000);
        expect(sonnetModel.contextWindow).toBeGreaterThanOrEqual(200000);
      }
    });

    it('should support enterprise-scale context requirements', () => {
      ANTHROPIC_MODELS.forEach((model) => {
        // All models should support enterprise-scale contexts
        expect(model.contextWindow).toBeGreaterThanOrEqual(100000);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle model access safely', () => {
      // Test accessing model properties safely
      expect(() => {
        ANTHROPIC_MODELS.forEach((model) => {
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
        expect(provider).toBe('anthropic');
        expect(name).toBeDefined();
        expect(title).toBeDefined();
        expect(contextWindow).toBeGreaterThan(0);
      }).not.toThrow();
    });
  });

  describe('Integration Points', () => {
    it('should be usable for model selection logic', () => {
      // Test common model selection patterns
      const modelByName = ANTHROPIC_MODELS.find(
        (m) => m.name === 'claude-opus-4-1-20250805',
      );
      expect(modelByName).toBeDefined();

      const modelsByVariant = ANTHROPIC_MODELS.filter((m) =>
        m.name.includes('sonnet'),
      );
      expect(modelsByVariant.length).toBeGreaterThan(0);

      const highContextModels = ANTHROPIC_MODELS.filter(
        (m) => m.contextWindow >= 200000,
      );
      expect(highContextModels.length).toBe(ANTHROPIC_MODELS.length);
    });

    it('should provide sufficient information for API calls', () => {
      ANTHROPIC_MODELS.forEach((model) => {
        // Each model should have enough info to make API calls
        expect(model.name).toBeDefined(); // For API model parameter
        expect(model.provider).toBe('anthropic'); // For service selection
        expect(model.contextWindow).toBeGreaterThan(0); // For token management
      });
    });

    it('should support model comparison and selection', () => {
      // Test that models can be compared for selection
      const sortedByContext = [...ANTHROPIC_MODELS].sort(
        (a, b) => b.contextWindow - a.contextWindow,
      );
      expect(sortedByContext.length).toBe(ANTHROPIC_MODELS.length);

      const sortedByName = [...ANTHROPIC_MODELS].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      expect(sortedByName.length).toBe(ANTHROPIC_MODELS.length);
    });
  });
});
