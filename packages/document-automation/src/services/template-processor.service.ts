/**
 * Template Processing Service
 * Handles template compilation, data binding, and content generation
 */

import { Injectable, Logger } from '@nestjs/common';
import { TemplateDefinition, GenerationOptions } from '../types/document.types';
import * as Handlebars from 'handlebars';

@Injectable()
export class TemplateProcessor {
  private readonly logger = new Logger(TemplateProcessor.name);

  constructor() {
    this.registerHelpers();
  }

  async processTemplate(
    template: TemplateDefinition,
    data: Record<string, any>,
    options: GenerationOptions
  ): Promise<Buffer> {
    this.logger.log(`Processing template: ${template.id}`);

    try {
      // Compile template
      const compiledTemplate = Handlebars.compile(template.content);

      // Render with data
      const rendered = compiledTemplate(data);

      return Buffer.from(rendered, 'utf-8');
    } catch (error) {
      this.logger.error(`Template processing failed: ${error.message}`);
      throw error;
    }
  }

  private registerHelpers(): void {
    // Register custom Handlebars helpers
    Handlebars.registerHelper('formatDate', (date: Date) => {
      return date.toLocaleDateString();
    });

    Handlebars.registerHelper('upperCase', (text: string) => {
      return text.toUpperCase();
    });
  }
}