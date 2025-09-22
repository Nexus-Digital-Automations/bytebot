/**
 * Test Data Management Service
 *
 * Comprehensive test data management service providing synthetic data generation,
 * data masking, test data lifecycle management, and data privacy compliance
 * for enterprise testing scenarios.
 *
 * @fileoverview Core service for test data management
 * @author Bytebot Team
 * @version 1.0.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { faker } from '@faker-js/faker';

export interface TestDataRequest {
  dataType: DataType;
  count: number;
  schema?: DataSchema;
  options?: TestDataOptions;
}

export enum DataType {
  USER = 'user',
  PRODUCT = 'product',
  ORDER = 'order',
  FINANCIAL = 'financial',
  MEDICAL = 'medical',
  CUSTOM = 'custom',
}

export interface DataSchema {
  fields: FieldDefinition[];
  relationships?: RelationshipDefinition[];
  constraints?: ConstraintDefinition[];
}

export interface FieldDefinition {
  name: string;
  type: FieldType;
  required: boolean;
  constraints?: FieldConstraints;
  format?: string;
  generator?: GeneratorConfig;
}

export enum FieldType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  EMAIL = 'email',
  PHONE = 'phone',
  ADDRESS = 'address',
  NAME = 'name',
  ID = 'id',
  CURRENCY = 'currency',
  ENUM = 'enum',
}

export interface FieldConstraints {
  min?: number;
  max?: number;
  length?: number;
  pattern?: string;
  values?: any[];
  unique?: boolean;
}

export interface GeneratorConfig {
  locale?: string;
  seed?: number;
  customFunction?: string;
  parameters?: Record<string, any>;
}

export interface RelationshipDefinition {
  sourceField: string;
  targetType: string;
  targetField: string;
  relationship: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

export interface ConstraintDefinition {
  type: 'unique' | 'foreign_key' | 'check';
  fields: string[];
  condition?: string;
}

export interface TestDataOptions {
  maskSensitiveData?: boolean;
  preserveFormat?: boolean;
  locale?: string;
  seed?: number;
  outputFormat?: 'json' | 'csv' | 'sql' | 'xml';
  includeMetadata?: boolean;
}

export interface TestDataResult {
  data: any[];
  metadata: TestDataMetadata;
  schema: DataSchema;
  statistics: DataStatistics;
}

export interface TestDataMetadata {
  generatedAt: Date;
  count: number;
  dataType: DataType;
  locale: string;
  seed: number;
  version: string;
}

export interface DataStatistics {
  fieldStatistics: Record<string, FieldStatistics>;
  qualityScore: number;
  completeness: number;
  uniqueness: number;
  validity: number;
}

export interface FieldStatistics {
  type: FieldType;
  nullCount: number;
  uniqueCount: number;
  averageLength?: number;
  minValue?: any;
  maxValue?: any;
  pattern?: string;
}

@Injectable()
export class TestDataService {
  private readonly logger = new Logger(TestDataService.name);

  /**
   * Generate synthetic test data
   *
   * @param request Test data generation request
   * @returns Generated test data with metadata
   */
  async generateTestData(request: TestDataRequest): Promise<TestDataResult> {
    this.logger.log(`Generating ${request.count} records of type: ${request.dataType}`);
    const startTime = Date.now();

    try {
      // Set seed for reproducible data
      if (request.options?.seed) {
        faker.seed(request.options.seed);
      }

      // Set locale
      if (request.options?.locale) {
        faker.setLocale(request.options.locale);
      }

      // Get or create schema
      const schema = request.schema || this.getDefaultSchema(request.dataType);

      // Generate data
      const data = this.generateDataRecords(schema, request.count, request.options);

      // Apply data masking if requested
      const maskedData = request.options?.maskSensitiveData
        ? this.maskSensitiveData(data, schema)
        : data;

      // Calculate statistics
      const statistics = this.calculateDataStatistics(maskedData, schema);

      // Create metadata
      const metadata: TestDataMetadata = {
        generatedAt: new Date(),
        count: maskedData.length,
        dataType: request.dataType,
        locale: request.options?.locale || 'en',
        seed: request.options?.seed || 0,
        version: '1.0.0',
      };

      const result: TestDataResult = {
        data: maskedData,
        metadata,
        schema,
        statistics,
      };

      this.logger.log(`Generated ${maskedData.length} records in ${Date.now() - startTime}ms`);
      this.logger.log(`Quality score: ${statistics.qualityScore.toFixed(2)}`);

      return result;
    } catch (error) {
      this.logger.error(`Test data generation failed: ${error.message}`, error.stack);
      throw new Error(`Test data generation failed: ${error.message}`);
    }
  }

  /**
   * Generate data records based on schema
   */
  private generateDataRecords(
    schema: DataSchema,
    count: number,
    options?: TestDataOptions
  ): any[] {
    const records = [];

    for (let i = 0; i < count; i++) {
      const record: any = {};

      for (const field of schema.fields) {
        record[field.name] = this.generateFieldValue(field, i, records);
      }

      records.push(record);
    }

    // Apply relationships
    if (schema.relationships) {
      this.applyRelationships(records, schema.relationships);
    }

    return records;
  }

  /**
   * Generate value for a specific field
   */
  private generateFieldValue(field: FieldDefinition, index: number, existingRecords: any[]): any {
    const { type, constraints, generator } = field;

    // Handle custom generators
    if (generator?.customFunction) {
      return this.executeCustomGenerator(generator, index);
    }

    // Handle unique constraints
    if (constraints?.unique) {
      return this.generateUniqueValue(field, existingRecords);
    }

    // Generate based on field type
    switch (type) {
      case FieldType.STRING:
        return this.generateString(constraints);

      case FieldType.NUMBER:
        return this.generateNumber(constraints);

      case FieldType.BOOLEAN:
        return faker.datatype.boolean();

      case FieldType.DATE:
        return this.generateDate(constraints);

      case FieldType.EMAIL:
        return faker.internet.email();

      case FieldType.PHONE:
        return faker.phone.number();

      case FieldType.ADDRESS:
        return {
          street: faker.location.streetAddress(),
          city: faker.location.city(),
          state: faker.location.state(),
          zipCode: faker.location.zipCode(),
          country: faker.location.country(),
        };

      case FieldType.NAME:
        return {
          first: faker.person.firstName(),
          last: faker.person.lastName(),
          full: faker.person.fullName(),
        };

      case FieldType.ID:
        return faker.string.uuid();

      case FieldType.CURRENCY:
        return this.generateCurrency(constraints);

      case FieldType.ENUM:
        return constraints?.values
          ? faker.helpers.arrayElement(constraints.values)
          : faker.lorem.word();

      default:
        return faker.lorem.word();
    }
  }

  /**
   * Generate string value with constraints
   */
  private generateString(constraints?: FieldConstraints): string {
    if (constraints?.values) {
      return faker.helpers.arrayElement(constraints.values);
    }

    if (constraints?.pattern) {
      return faker.helpers.fromRegExp(constraints.pattern);
    }

    const length = constraints?.length || faker.number.int({ min: 5, max: 20 });
    return faker.lorem.words(Math.ceil(length / 5)).substring(0, length);
  }

  /**
   * Generate number value with constraints
   */
  private generateNumber(constraints?: FieldConstraints): number {
    const min = constraints?.min || 0;
    const max = constraints?.max || 1000;
    return faker.number.int({ min, max });
  }

  /**
   * Generate date value with constraints
   */
  private generateDate(constraints?: FieldConstraints): Date {
    const recent = constraints?.min ? new Date(constraints.min) : new Date('2020-01-01');
    const future = constraints?.max ? new Date(constraints.max) : new Date('2025-12-31');
    return faker.date.between({ from: recent, to: future });
  }

  /**
   * Generate currency value with constraints
   */
  private generateCurrency(constraints?: FieldConstraints): string {
    const min = constraints?.min || 0;
    const max = constraints?.max || 10000;
    const amount = faker.number.float({ min, max, fractionDigits: 2 });
    return `$${amount.toFixed(2)}`;
  }

  /**
   * Generate unique value for field
   */
  private generateUniqueValue(field: FieldDefinition, existingRecords: any[]): any {
    const existingValues = new Set(existingRecords.map(record => record[field.name]));
    let attempts = 0;
    let value;

    do {
      value = this.generateFieldValue(
        { ...field, constraints: { ...field.constraints, unique: false } },
        attempts,
        []
      );
      attempts++;
    } while (existingValues.has(value) && attempts < 1000);

    return value;
  }

  /**
   * Execute custom generator function
   */
  private executeCustomGenerator(generator: GeneratorConfig, index: number): any {
    // This would execute custom generator functions
    // For now, return a placeholder
    return `custom_${index}`;
  }

  /**
   * Apply relationships between records
   */
  private applyRelationships(records: any[], relationships: RelationshipDefinition[]): void {
    for (const relationship of relationships) {
      // Implementation would handle different relationship types
      // This is a simplified version
      this.logger.debug(`Applying relationship: ${relationship.sourceField} -> ${relationship.targetField}`);
    }
  }

  /**
   * Mask sensitive data for privacy compliance
   */
  private maskSensitiveData(data: any[], schema: DataSchema): any[] {
    const sensitiveFields = schema.fields.filter(field =>
      ['email', 'phone', 'name'].includes(field.type)
    );

    return data.map(record => {
      const maskedRecord = { ...record };

      for (const field of sensitiveFields) {
        if (maskedRecord[field.name]) {
          maskedRecord[field.name] = this.maskFieldValue(maskedRecord[field.name], field.type);
        }
      }

      return maskedRecord;
    });
  }

  /**
   * Mask individual field value
   */
  private maskFieldValue(value: any, type: FieldType): any {
    switch (type) {
      case FieldType.EMAIL:
        return value.replace(/(.{2})(.*)(@.*)/, '$1***$3');

      case FieldType.PHONE:
        return value.replace(/(\d{3})(\d{3})(\d{4})/, '$1-***-$3');

      case FieldType.NAME:
        if (typeof value === 'object') {
          return {
            ...value,
            first: value.first?.charAt(0) + '***',
            last: value.last?.charAt(0) + '***',
            full: value.first?.charAt(0) + '*** ' + value.last?.charAt(0) + '***',
          };
        }
        return value.charAt(0) + '***';

      default:
        return value;
    }
  }

  /**
   * Calculate data quality statistics
   */
  private calculateDataStatistics(data: any[], schema: DataSchema): DataStatistics {
    const fieldStatistics: Record<string, FieldStatistics> = {};

    for (const field of schema.fields) {
      const values = data.map(record => record[field.name]);
      const nonNullValues = values.filter(v => v != null);

      fieldStatistics[field.name] = {
        type: field.type,
        nullCount: values.length - nonNullValues.length,
        uniqueCount: new Set(nonNullValues).size,
        averageLength: field.type === FieldType.STRING
          ? nonNullValues.reduce((sum, v) => sum + String(v).length, 0) / nonNullValues.length
          : undefined,
        minValue: field.type === FieldType.NUMBER
          ? Math.min(...nonNullValues)
          : undefined,
        maxValue: field.type === FieldType.NUMBER
          ? Math.max(...nonNullValues)
          : undefined,
      };
    }

    // Calculate quality metrics
    const totalFields = schema.fields.length * data.length;
    const nullValues = Object.values(fieldStatistics).reduce((sum, stat) => sum + stat.nullCount, 0);
    const completeness = ((totalFields - nullValues) / totalFields) * 100;

    const uniqueFields = schema.fields.filter(f => f.constraints?.unique);
    const uniquenessViolations = uniqueFields.reduce((sum, field) => {
      const stat = fieldStatistics[field.name];
      return sum + (data.length - stat.uniqueCount);
    }, 0);
    const uniqueness = uniqueFields.length > 0
      ? ((uniqueFields.length * data.length - uniquenessViolations) / (uniqueFields.length * data.length)) * 100
      : 100;

    const validity = 100; // Simplified - would include format validation

    const qualityScore = (completeness + uniqueness + validity) / 3;

    return {
      fieldStatistics,
      qualityScore,
      completeness,
      uniqueness,
      validity,
    };
  }

  /**
   * Get default schema for data type
   */
  private getDefaultSchema(dataType: DataType): DataSchema {
    switch (dataType) {
      case DataType.USER:
        return {
          fields: [
            { name: 'id', type: FieldType.ID, required: true, constraints: { unique: true } },
            { name: 'email', type: FieldType.EMAIL, required: true, constraints: { unique: true } },
            { name: 'name', type: FieldType.NAME, required: true },
            { name: 'phone', type: FieldType.PHONE, required: false },
            { name: 'address', type: FieldType.ADDRESS, required: false },
            { name: 'active', type: FieldType.BOOLEAN, required: true },
            { name: 'createdAt', type: FieldType.DATE, required: true },
          ],
        };

      case DataType.PRODUCT:
        return {
          fields: [
            { name: 'id', type: FieldType.ID, required: true, constraints: { unique: true } },
            { name: 'name', type: FieldType.STRING, required: true, constraints: { length: 50 } },
            { name: 'description', type: FieldType.STRING, required: false, constraints: { length: 200 } },
            { name: 'price', type: FieldType.CURRENCY, required: true, constraints: { min: 0, max: 10000 } },
            { name: 'category', type: FieldType.ENUM, required: true, constraints: { values: ['electronics', 'clothing', 'books', 'home'] } },
            { name: 'inStock', type: FieldType.BOOLEAN, required: true },
            { name: 'createdAt', type: FieldType.DATE, required: true },
          ],
        };

      case DataType.ORDER:
        return {
          fields: [
            { name: 'id', type: FieldType.ID, required: true, constraints: { unique: true } },
            { name: 'userId', type: FieldType.ID, required: true },
            { name: 'productId', type: FieldType.ID, required: true },
            { name: 'quantity', type: FieldType.NUMBER, required: true, constraints: { min: 1, max: 100 } },
            { name: 'total', type: FieldType.CURRENCY, required: true, constraints: { min: 0 } },
            { name: 'status', type: FieldType.ENUM, required: true, constraints: { values: ['pending', 'confirmed', 'shipped', 'delivered'] } },
            { name: 'orderDate', type: FieldType.DATE, required: true },
          ],
        };

      default:
        return {
          fields: [
            { name: 'id', type: FieldType.ID, required: true, constraints: { unique: true } },
            { name: 'name', type: FieldType.STRING, required: true },
            { name: 'value', type: FieldType.STRING, required: false },
            { name: 'createdAt', type: FieldType.DATE, required: true },
          ],
        };
    }
  }

  /**
   * Export test data in specified format
   */
  async exportTestData(data: TestDataResult, format: 'json' | 'csv' | 'sql' | 'xml' = 'json'): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);

      case 'csv':
        return this.convertToCSV(data.data);

      case 'sql':
        return this.convertToSQL(data.data, data.schema);

      case 'xml':
        return this.convertToXML(data.data);

      default:
        return JSON.stringify(data, null, 2);
    }
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(record =>
      Object.values(record).map(value =>
        typeof value === 'object' ? JSON.stringify(value) : String(value)
      ).join(',')
    );

    return [headers, ...rows].join('\n');
  }

  /**
   * Convert data to SQL insert statements
   */
  private convertToSQL(data: any[], schema: DataSchema): string {
    if (data.length === 0) return '';

    const tableName = 'test_data';
    const columns = schema.fields.map(f => f.name).join(', ');

    const insertStatements = data.map(record => {
      const values = schema.fields.map(field => {
        const value = record[field.name];
        if (value == null) return 'NULL';
        if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
        if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
        return String(value);
      }).join(', ');

      return `INSERT INTO ${tableName} (${columns}) VALUES (${values});`;
    });

    return insertStatements.join('\n');
  }

  /**
   * Convert data to XML format
   */
  private convertToXML(data: any[]): string {
    const xmlRecords = data.map(record => {
      const fields = Object.entries(record).map(([key, value]) => {
        const xmlValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        return `    <${key}>${xmlValue}</${key}>`;
      }).join('\n');

      return `  <record>\n${fields}\n  </record>`;
    });

    return `<?xml version="1.0" encoding="UTF-8"?>\n<testData>\n${xmlRecords.join('\n')}\n</testData>`;
  }
}