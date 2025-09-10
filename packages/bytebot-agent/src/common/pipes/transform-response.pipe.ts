/**
 * Transform Response Pipe
 *
 * Custom pipe for transforming and standardizing API response format.
 * Ensures consistent response structure across all endpoints.
 */

import { Injectable, PipeTransform, ArgumentMetadata } from '@nestjs/common';
import { Logger } from '@nestjs/common';

export interface StandardizedResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp: string;
  correlationId?: string;
  metadata?: {
    version: string;
    endpoint: string;
    executionTime?: number;
  };
}

@Injectable()
export class TransformResponsePipe implements PipeTransform {
  private readonly logger = new Logger(TransformResponsePipe.name);

  transform(value: any, metadata: ArgumentMetadata): any {
    // Skip transformation for certain types
    if (metadata.type !== 'body' && metadata.type !== 'query') {
      return value;
    }

    // Skip if already transformed
    if (value && typeof value === 'object' && 'success' in value) {
      return value;
    }

    this.logger.debug(`Transforming response data: ${metadata.type}`);

    return value; // Return as-is for now, transformation happens in interceptor
  }
}
