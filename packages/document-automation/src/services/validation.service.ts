/**
 * Validation Service
 * Handles data validation, schema validation, and business rule enforcement
 */

import { Injectable, Logger } from '@nestjs/common';
import { DocumentGenerationRequest, TemplateSchema } from '../types/document.types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);

  async validateGenerationRequest(request: DocumentGenerationRequest): Promise<ValidationResult> {
    const errors: string[] = [];

    // Basic validation
    if (!request.templateId) {
      errors.push('Template ID is required');
    }

    if (!request.data || Object.keys(request.data).length === 0) {
      errors.push('Data is required and cannot be empty');
    }

    if (!request.format) {
      errors.push('Output format is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async validateDataAgainstSchema(data: Record<string, any>, schema: TemplateSchema): Promise<ValidationResult> {
    const errors: string[] = [];

    // TODO: Implement comprehensive schema validation
    // For now, just check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in data)) {
          errors.push(`Required field '${field}' is missing`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}