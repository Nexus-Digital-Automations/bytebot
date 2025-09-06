/**
 * Output Encoding Service - Context-Aware Output Security
 *
 * This service provides context-aware output encoding to prevent XSS attacks
 * in different rendering contexts including HTML, JavaScript, CSS, and URLs.
 *
 * @fileoverview Context-aware output encoding service
 * @version 1.0.0
 * @author Output Security Specialist
 */

import { Injectable, Logger } from "@nestjs/common";
import { generateCSPHeader } from "../utils/security.utils";

/**
 * Output encoding contexts
 */
export type EncodingContext =
  | "html"
  | "html_attribute"
  | "javascript"
  | "css"
  | "url"
  | "json"
  | "xml"
  | "csv";

/**
 * Encoding configuration
 */
interface EncodingConfig {
  /** Enable HTML entity encoding */
  htmlEntity: boolean;

  /** Enable JavaScript escaping */
  javascriptEscape: boolean;

  /** Enable CSS value encoding */
  cssEncode: boolean;

  /** Enable URL encoding */
  urlEncode: boolean;

  /** Enable strict mode (more aggressive encoding) */
  strictMode: boolean;

  /** Custom character mappings */
  customMappings?: Record<string, string>;
}

/**
 * Default encoding configuration
 */
const DEFAULT_ENCODING_CONFIG: EncodingConfig = {
  htmlEntity: true,
  javascriptEscape: true,
  cssEncode: true,
  urlEncode: true,
  strictMode: false,
};

/**
 * Encoding result
 */
interface EncodingResult {
  encoded: string;
  context: EncodingContext;
  originalLength: number;
  encodedLength: number;
  charactersEncoded: number;
  safe: boolean;
}

@Injectable()
export class OutputEncodingService {
  private readonly logger = new Logger(OutputEncodingService.name);
  private readonly config: EncodingConfig;

  constructor(config?: Partial<EncodingConfig>) {
    this.config = { ...DEFAULT_ENCODING_CONFIG, ...config };

    this.logger.log("Output Encoding Service initialized", {
      htmlEntity: this.config.htmlEntity,
      javascriptEscape: this.config.javascriptEscape,
      cssEncode: this.config.cssEncode,
      urlEncode: this.config.urlEncode,
      strictMode: this.config.strictMode,
    });
  }

  /**
   * Encode output for specific context
   */
  encodeForContext(input: string, context: EncodingContext): EncodingResult {
    if (!input || typeof input !== "string") {
      return {
        encoded: "",
        context,
        originalLength: 0,
        encodedLength: 0,
        charactersEncoded: 0,
        safe: true,
      };
    }

    const startTime = Date.now();
    const originalLength = input.length;
    let encoded: string;
    let charactersEncoded = 0;

    switch (context) {
      case "html":
        encoded = this.encodeHtml(input);
        break;
      case "html_attribute":
        encoded = this.encodeHtmlAttribute(input);
        break;
      case "javascript":
        encoded = this.encodeJavaScript(input);
        break;
      case "css":
        encoded = this.encodeCss(input);
        break;
      case "url":
        encoded = this.encodeUrl(input);
        break;
      case "json":
        encoded = this.encodeJson(input);
        break;
      case "xml":
        encoded = this.encodeXml(input);
        break;
      case "csv":
        encoded = this.encodeCsv(input);
        break;
      default:
        encoded = this.encodeHtml(input); // Default to HTML encoding
    }

    charactersEncoded = this.countEncodedCharacters(input, encoded);
    const processingTime = Date.now() - startTime;

    this.logger.debug("Output encoding completed", {
      context,
      originalLength,
      encodedLength: encoded.length,
      charactersEncoded,
      processingTimeMs: processingTime,
    });

    return {
      encoded,
      context,
      originalLength,
      encodedLength: encoded.length,
      charactersEncoded,
      safe: true,
    };
  }

  /**
   * HTML context encoding
   */
  private encodeHtml(input: string): string {
    if (!this.config.htmlEntity) {
      return input;
    }

    const htmlEntities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#x27;",
      "/": "&#x2F;",
      "`": "&#96;",
    };

    // Extended entities for strict mode
    if (this.config.strictMode) {
      Object.assign(htmlEntities, {
        "(": "&#40;",
        ")": "&#41;",
        "{": "&#123;",
        "}": "&#125;",
        "[": "&#91;",
        "]": "&#93;",
        "=": "&#61;",
        "+": "&#43;",
        "*": "&#42;",
        "%": "&#37;",
        "!": "&#33;",
        "@": "&#64;",
        $: "&#36;",
        "^": "&#94;",
        "|": "&#124;",
        "\\": "&#92;",
      });
    }

    // Apply custom mappings
    if (this.config.customMappings) {
      Object.assign(htmlEntities, this.config.customMappings);
    }

    return this.replaceCharacters(input, htmlEntities);
  }

  /**
   * HTML attribute context encoding
   */
  private encodeHtmlAttribute(input: string): string {
    const attributeEntities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#x27;",
      "`": "&#96;",
      "=": "&#61;",
      "\n": "&#10;",
      "\r": "&#13;",
      "\t": "&#9;",
    };

    if (this.config.strictMode) {
      Object.assign(attributeEntities, {
        " ": "&#32;",
        "/": "&#x2F;",
        "(": "&#40;",
        ")": "&#41;",
        "{": "&#123;",
        "}": "&#125;",
        "[": "&#91;",
        "]": "&#93;",
      });
    }

    return this.replaceCharacters(input, attributeEntities);
  }

  /**
   * JavaScript context encoding
   */
  private encodeJavaScript(input: string): string {
    if (!this.config.javascriptEscape) {
      return input;
    }

    const jsEscapes: Record<string, string> = {
      "\\": "\\\\",
      '"': '\\"',
      "'": "\\'",
      "\n": "\\n",
      "\r": "\\r",
      "\t": "\\t",
      "\b": "\\b",
      "\f": "\\f",
      "\v": "\\v",
      "\0": "\\0",
      "/": "\\/",
      "<": "\\u003c",
      ">": "\\u003e",
      "&": "\\u0026",
    };

    // Unicode escape for control characters
    let encoded = this.replaceCharacters(input, jsEscapes);

    // Escape control characters (0x00-0x1f and 0x7f-0x9f)
    encoded = encoded.replace(/[\x00-\x1f\x7f-\x9f]/g, (char) => {
      return "\\u" + ("0000" + char.charCodeAt(0).toString(16)).slice(-4);
    });

    return encoded;
  }

  /**
   * CSS context encoding
   */
  private encodeCss(input: string): string {
    if (!this.config.cssEncode) {
      return input;
    }

    // CSS hex escape for special characters
    return input.replace(/[^a-zA-Z0-9\-_]/g, (char) => {
      const code = char.charCodeAt(0);
      if (code < 256) {
        return "\\" + ("00" + code.toString(16)).slice(-2) + " ";
      } else {
        return "\\" + ("0000" + code.toString(16)).slice(-4) + " ";
      }
    });
  }

  /**
   * URL context encoding
   */
  private encodeUrl(input: string): string {
    if (!this.config.urlEncode) {
      return input;
    }

    try {
      return encodeURIComponent(input);
    } catch (error) {
      this.logger.warn("URL encoding failed, falling back to manual encoding", {
        input: input.substring(0, 100),
        error: error.message,
      });

      // Manual encoding for problematic characters
      return input.replace(/[^a-zA-Z0-9\-_.~]/g, (char) => {
        return (
          "%" + ("00" + char.charCodeAt(0).toString(16)).slice(-2).toUpperCase()
        );
      });
    }
  }

  /**
   * JSON context encoding
   */
  private encodeJson(input: string): string {
    try {
      return JSON.stringify(input);
    } catch (error) {
      this.logger.warn("JSON encoding failed", {
        input: input.substring(0, 100),
        error: error.message,
      });

      // Manual JSON string escaping
      const jsonEscapes: Record<string, string> = {
        '"': '\\"',
        "\\": "\\\\",
        "\b": "\\b",
        "\f": "\\f",
        "\n": "\\n",
        "\r": "\\r",
        "\t": "\\t",
      };

      return '"' + this.replaceCharacters(input, jsonEscapes) + '"';
    }
  }

  /**
   * XML context encoding
   */
  private encodeXml(input: string): string {
    const xmlEntities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&apos;",
    };

    return this.replaceCharacters(input, xmlEntities);
  }

  /**
   * CSV context encoding
   */
  private encodeCsv(input: string): string {
    // Check if escaping is needed
    const needsEscaping = /[",\r\n]/.test(input);

    if (needsEscaping) {
      // Escape quotes by doubling them and wrap in quotes
      return '"' + input.replace(/"/g, '""') + '"';
    }

    return input;
  }

  /**
   * Batch encode multiple values
   */
  batchEncode(
    items: Array<{ value: string; context: EncodingContext }>,
  ): EncodingResult[] {
    const startTime = Date.now();

    const results = items.map((item) =>
      this.encodeForContext(item.value, item.context),
    );

    const totalProcessingTime = Date.now() - startTime;

    this.logger.debug("Batch encoding completed", {
      itemCount: items.length,
      totalProcessingTimeMs: totalProcessingTime,
      averageTimePerItem: Math.round(totalProcessingTime / items.length),
    });

    return results;
  }

  /**
   * Generate secure template with encoded placeholders
   */
  generateSecureTemplate(
    template: string,
    placeholders: Record<string, { value: string; context: EncodingContext }>,
  ): string {
    let secureTemplate = template;

    for (const [placeholder, config] of Object.entries(placeholders)) {
      const encodingResult = this.encodeForContext(
        config.value,
        config.context,
      );
      const placeholderPattern = new RegExp(`{{\\s*${placeholder}\\s*}}`, "g");
      secureTemplate = secureTemplate.replace(
        placeholderPattern,
        encodingResult.encoded,
      );
    }

    return secureTemplate;
  }

  /**
   * Generate Content Security Policy with nonce
   */
  generateCSPWithNonce(
    context: "api" | "ui" | "admin",
    nonce?: string,
  ): string {
    return generateCSPHeader(context).replace(
      "{nonce}",
      nonce || this.generateNonce(),
    );
  }

  /**
   * Generate cryptographically secure nonce
   */
  private generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      "",
    );
  }

  /**
   * Validate encoding effectiveness
   */
  validateEncoding(
    original: string,
    encoded: string,
    context: EncodingContext,
  ): {
    safe: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for potentially dangerous patterns that weren't encoded
    const dangerousPatterns = [
      { pattern: /<script/i, name: "Script tag" },
      { pattern: /javascript:/i, name: "JavaScript protocol" },
      { pattern: /on\w+\s*=/i, name: "Event handler" },
      { pattern: /eval\(/i, name: "Eval function" },
      { pattern: /expression\(/i, name: "CSS expression" },
    ];

    for (const { pattern, name } of dangerousPatterns) {
      if (pattern.test(encoded)) {
        issues.push(`${name} found in encoded output`);
        recommendations.push(
          `Review ${context} encoding for ${name.toLowerCase()}`,
        );
      }
    }

    // Context-specific validations
    if (
      context === "html" &&
      encoded.includes("&") &&
      !encoded.includes("&amp;")
    ) {
      issues.push("Unencoded ampersand in HTML context");
      recommendations.push("Ensure all ampersands are HTML entity encoded");
    }

    if (context === "javascript" && encoded.includes("</script>")) {
      issues.push("Script closing tag found in JavaScript context");
      recommendations.push("Use proper JavaScript escaping for script content");
    }

    return {
      safe: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * Helper methods
   */
  private replaceCharacters(
    input: string,
    mappings: Record<string, string>,
  ): string {
    let result = input;

    for (const [char, replacement] of Object.entries(mappings)) {
      const regex = new RegExp(this.escapeRegExp(char), "g");
      result = result.replace(regex, replacement);
    }

    return result;
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private countEncodedCharacters(original: string, encoded: string): number {
    let count = 0;
    let originalIndex = 0;
    let encodedIndex = 0;

    while (originalIndex < original.length && encodedIndex < encoded.length) {
      if (original[originalIndex] === encoded[encodedIndex]) {
        originalIndex++;
        encodedIndex++;
      } else {
        count++;
        originalIndex++;
        // Skip to next character in encoded string
        while (
          encodedIndex < encoded.length &&
          original[originalIndex] !== encoded[encodedIndex]
        ) {
          encodedIndex++;
        }
      }
    }

    return count;
  }
}

export default OutputEncodingService;
