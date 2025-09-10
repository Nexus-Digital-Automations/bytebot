/**
 * Type declarations for sanitize-html module
 * Added to resolve TypeScript compilation issues
 */

declare module "sanitize-html" {
  interface IOptions {
    allowedTags?: string[] | false;
    allowedAttributes?: Record<string, string[]> | false;
    allowedClasses?: Record<string, string[] | boolean>;
    allowedSchemes?: string[];
    allowedSchemesByTag?: Record<string, string[]>;
    allowProtocolRelative?: boolean;
    disallowedTagsMode?: "discard" | "escape" | "recursiveEscape";
    enforceHtmlBoundary?: boolean;
    nonTextTags?: string[];
    selfClosing?: string[];
    textFilter?: (_text: string, _tagName: string) => string;
    exclusiveFilter?: (_frame: { tag: string; text?: string }) => boolean;
    nestingLimit?: number;
    parseStyleAttributes?: boolean;
  }

  interface sanitizeHtml {
    (_dirty: string, _options?: IOptions): string;
    defaults: IOptions;
    simpleTransform: (
      _tagName: string,
      _attribs: Record<string, string>,
      _merge?: boolean,
    ) => (
      _tagName: string,
      _attribs: Record<string, string>,
    ) => {
      tagName: string;
      attribs: Record<string, string>;
    };
  }

  const sanitizeHtml: sanitizeHtml;
  export = sanitizeHtml;
}
