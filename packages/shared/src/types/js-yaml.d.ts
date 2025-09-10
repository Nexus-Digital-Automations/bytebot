/**
 * Type declarations for js-yaml library
 * Provides type-safe definitions for YAML parsing functionality
 */

declare module "js-yaml" {
  // YAML value types that can be parsed/serialized
  export type YAMLValue =
    | string
    | number
    | boolean
    | null
    | YAMLValue[]
    | { [key: string]: YAMLValue };

  // Options for YAML parsing
  export interface LoadOptions {
    filename?: string;
    onWarning?: (_warning: YAMLException) => void;
    json?: boolean;
    schema?: Schema;
  }

  // Options for YAML dumping
  export interface DumpOptions {
    indent?: number;
    noArrayIndent?: boolean;
    skipInvalid?: boolean;
    flowLevel?: number;
    styles?: { [x: string]: "block" | "flow" | "folded" | "literal" };
    schema?: Schema;
    sortKeys?: boolean | ((_a: string, _b: string) => number);
    lineWidth?: number;
    noRefs?: boolean;
    noCompatMode?: boolean;
    condenseFlow?: boolean;
    quotingType?: '"' | "'";
    forceQuotes?: boolean;
  }

  // Schema type for YAML parsing
  export interface Schema {
    include?: Schema[];
    implicit?: Type[];
    explicit?: Type[];
  }

  // Type definition for YAML types
  export interface Type {
    tag: string;
    kind: "scalar" | "sequence" | "mapping";
    resolve?: (_data: unknown) => boolean;
    construct?: (_data: unknown) => unknown;
    instanceOf?: unknown;
    predicate?: (_data: unknown) => boolean;
    represent?: unknown;
    defaultStyle?: string;
    styleAliases?: { [x: string]: unknown };
  }

  // Mark interface for error positioning
  export interface Mark {
    name: string;
    buffer: string;
    position: number;
    line: number;
    column: number;
  }

  // Main parsing functions
  export function load(_str: string, _options?: LoadOptions): YAMLValue;
  export function dump(_obj: YAMLValue, _options?: DumpOptions): string;
  export function safeLoad(_str: string, _options?: LoadOptions): YAMLValue;
  export function safeDump(_obj: YAMLValue, _options?: DumpOptions): string;

  export class YAMLException extends Error {
    constructor(_reason?: string, _mark?: Mark);
    reason: string;
    mark: Mark | null;
  }
}
