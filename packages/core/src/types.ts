import * as CSS from 'csstype';
import { IStylesheet, StylesheetStatement } from './styles/interfaces';

/**
 * Represents a style object, allowing both arbitrary keys and known CSS properties.
 * Values are either string or number.
 */
export type Styles = Partial<Record<keyof CSS.Properties, string | number>>;

export type StyleScope =
  | 'block'
  | 'inline'
  | 'table'
  | 'tableRow'
  | 'tableCell';

export interface StyleMeta {
  /** Does this property naturally flow down to its children? (e.g font-family on a parent div can be inherited by its children) */
  inherits: boolean;
  /** At which scopes is this property valid? (e.g textAlign is valid for block and tableCell, but not inline) */
  scopes: StyleScope[];
  /** (optional): Even if it inherits, who is allowed to receive it?. (e.g textAlign can cascade into block) */
  cascadeTo?: StyleScope[];
}

export type Formats = 'docx' | 'pdf' | 'xlsx' | (string & {});
/**
 * The base structure for all document elements in the intermediate representation.
 */
export interface BaseElement {
  /** The element type (e.g., 'paragraph', 'heading', etc.) */
  type: ElementType; // not strictly limited to a union
  /** Optional text content for the element */
  text?: string;
  /** Optional styles applied to the element */
  styles?: Styles;
  /** Optional HTML-like attributes */
  attributes?: { [key: string]: string | number };
  /** Optional metadata for custom use */
  metadata?: { [key: string]: unknown };
  /** Optional nested child elements */
  content?: DocumentElement[];
  /** Optional scope hinting from parser */
  scope?: StyleScope;
}
/**
 * All supported element type strings for document elements.
 */
export type ElementType =
  | 'paragraph'
  | 'heading'
  | 'image'
  | 'text'
  | 'line'
  | 'list'
  | 'list-item'
  | 'table'
  | 'table-row'
  | 'table-cell'
  | 'page'
  | 'page-break'
  | 'header'
  | 'footer'
  | 'fragment'
  | 'attribute'
  | (string & {});

/**
 * Represents a paragraph element, optionally containing text and/or child elements.
 */
export interface ParagraphElement extends BaseElement {
  type: 'paragraph';
  text?: string;
  content?: DocumentElement[];
}

/**
 * Represents a fragment element, optionally containing text and/or child elements.
 */
export interface FragmentElement extends BaseElement {
  type: 'fragment';
  text?: string;
  content?: DocumentElement[];
}

/**
 * Represents a fragment element, optionally containing text and/or child elements.
 */
export interface AttributeElement extends BaseElement {
  type: 'attribute';
  name?: string;
  text?: string;
  attributes?: Record<string, string | number>;
}

/**
 * Represents a horizontal line or divider element.
 */
export interface LineElement extends BaseElement {
  type: 'line';
}

/**
 * Represents a heading element with a specified level (e.g., h1-h6).
 */
export interface HeadingElement extends BaseElement {
  type: 'heading';
  /** The heading text */
  text: string;
  /** Heading level (1-6) */
  level: number;
}

/**
 * Represents an image element with a source URL or data URI.
 */
export interface ImageElement extends BaseElement {
  type: 'image';
  /** Image source (URL or data URI) */
  src: string;
}

/**
 * Represents a text node element.
 */
export interface TextElement extends BaseElement {
  type: 'text';
  /** The text content */
  text: string;
}

/**
 * Represents a list (ordered or unordered), containing list items.
 */
export interface ListElement extends BaseElement {
  type: 'list';
  text?: string;
  /** 'ordered' or 'unordered' */
  listType: 'ordered' | 'unordered';
  /** Optional marker style for the list */
  markerStyle?: string;
  /** Nesting level of the list */
  level: number;
  /** The list items */
  content: ListItemElement[];
}

/**
 * Represents a single item in a list, which may contain nested content.
 */
export interface ListItemElement extends BaseElement {
  type: 'list-item';
  text?: string;
  /** Nesting level of the list item */
  level: number;
  content: DocumentElement[];
}

/**
 * Represents a logical page section which may contain its own header and footer.
 */
export interface PageElement extends BaseElement {
  type: 'page';
  content?: DocumentElement[];
}

/** Represents a page break. */
export interface PageBreakElement extends BaseElement {
  type: 'page-break';
}

/** Represents a document header element. */
export interface HeaderElement extends BaseElement {
  type: 'header';
  content?: DocumentElement[];
}

/** Represents a document footer element. */
export interface FooterElement extends BaseElement {
  type: 'footer';
  content?: DocumentElement[];
}

/**
 * Union of all supported document element types in the intermediate representation.
 */
export type DocumentElement =
  | ParagraphElement
  | HeadingElement
  | ImageElement
  | ListElement
  | ListItemElement
  | TableElement
  | LineElement
  | TextElement
  | TableRowElement
  | TableCellElement
  | PageElement
  | PageBreakElement
  | HeaderElement
  | FooterElement
  | FragmentElement
  | AttributeElement
  | (BaseElement & {
      type: ElementType;
    });

/**
 * Represents a table, consisting of multiple rows.
 */
export interface TableElement extends BaseElement {
  type: 'table';
  /** The table rows */
  rows: TableRowElement[];
}

/**
 * Represents a row in a table, containing multiple cells.
 */
export interface TableRowElement extends BaseElement {
  type: 'table-row';
  /** The table cells */
  cells: TableCellElement[];
  /** Optional row-level styles */
  styles?: Styles;
  /** Optional row-level attributes */
  attributes?: Record<string, string | number>;
}

/**
 * Represents a cell within a table row, with optional colspan and rowspan.
 */
export interface TableCellElement extends BaseElement {
  type: 'table-cell';
  /** Number of columns this cell spans */
  colspan?: number;
  /** Number of rows this cell spans */
  rowspan?: number;
}

/**
 * Represents a cell in the table grid, including merge information for rendering.
 */
export interface GridCell {
  /** The underlying cell element, if present */
  cell?: TableCellElement;
  /** True if this is a horizontally merged cell */
  horizontal?: boolean; // placeholder for a horizontally merged cell
  /** True if this is a vertically merged cell */
  verticalMerge?: boolean; // placeholder for a vertically merged cell
  /** True if this is the starting (master) cell for a merge */
  isMaster?: boolean; // indicates the starting (master) cell
}

/**
 * Middleware function type for processing HTML strings asynchronously.
 */
export type Middleware = (html: string) => Promise<string>;

export interface Plugin {
  /** Optional plugin identifier for diagnostics. */
  name?: string;
  /**
   * Hook for transforming raw HTML before DOM parsing.
   */
  beforeParse?(html: string): string | Promise<string>;
  /**
   * Hook for transforming parsed document elements before adapter conversion.
   */
  afterParse?(
    elements: DocumentElement[]
  ): DocumentElement[] | Promise<DocumentElement[]>;
}
/**
 * Options passed to tag handlers for parsing HTML elements.
 */
/**
 * Options passed to tag handlers for parsing HTML elements.
 *
 * @property styles Optional styles to apply to the element, typically parsed from CSS or inline styles.
 * @property attributes Optional HTML-like attributes for the element (e.g., id, data-*, etc.).
 * @property level Optional nesting or hierarchy level (used for lists and headings).
 * @property rowspan Optional row span (for table cells).
 * @property colspan Optional column span (for table cells).
 * @property rows Optional array of table row elements (for tables).
 * @property metadata Optional additional metadata for the element.
 * @property children Optional array of parsed child DocumentElements.
 * @property text Optional text content for the element.
 * @property [key: string] Any additional custom properties required by specific handlers or extensions.
 */
export type TagHandlerOptions = {
  /** Optional styles to apply to the element. */
  styles?: Styles;
  /** Optional HTML-like attributes for the element. */
  attributes?: {
    [key: string]: string | number;
  };
  /** Optional nesting or hierarchy level (for lists/headings). */
  level?: number;
  /** Optional row span (for table cells). */
  rowspan?: number;
  /** Optional column span (for table cells). */
  colspan?: number;
  /** Optional array of table row elements (for tables). */
  rows?: TableRowElement[];
  /** Optional additional metadata for the element. */
  metadata?: {
    [key: string]: unknown;
  };
  /** Optional array of parsed child DocumentElements. */
  content?: DocumentElement[];
  /** Optional text content for the element. */
  text?: string;
  /** Optional scope hint. */
  scope?: StyleScope;
  /** Any additional custom properties required by specific handlers or extensions. */
  [key: string]: unknown;
};

/**
 * Function type for converting an HTML element or node to a DocumentElement.
 */
export type TagHandler = (
  element: HTMLElement,
  options?: TagHandlerOptions
) => DocumentElement | DocumentElement[];

/**
 * Associates an HTML tag name (or custom key) with a tag handler function.
 *
 * Use this type to register custom handlers for specific HTML tags or elements.
 * The `key` can be any valid HTML tag name (e.g., 'p', 'div', 'span'), or a custom string for special cases or web components.
 * The `handler` is a function that receives the element and parsing options, and returns the corresponding DocumentElement.
 *
 * Example:
 *   const paragraphHandler: TagHandlerObject = {
 *     key: 'p',
 *     handler: (element, options) => ({
 *       type: 'paragraph',
 *       text: element.textContent || '',
 *       ...options
 *     })
 *   };
 */
export type TagHandlerObject = {
  /** The HTML tag name or custom key this handler applies to (e.g. 'p', 'h1', 'custom-tag'). */
  key: keyof HTMLElementTagNameMap | (string & {});
  /**
   * The handler function to process elements with this tag/key.
   *
   * The handler is called for each matching HTML element during parsing and is responsible for returning a document element object.
   *
   * @param element - The source HTMLElement being processed.
   * @param options - An object containing contextual data for this element, including:
   *   - styles: A Record<string, string | number> of all computed styles for the element, with property names converted from kebab-case (e.g., 'font-size') to camelCase (e.g., 'fontSize').
   *   - attributes: A Record<string, string> of all HTML attributes present on the element.
   *   - metadata: Optional metadata propagated from parent elements (e.g., list nesting level).
   *   - content: Optional array of parsed child elements, if any.
   *   - text: Optional text content of the element, if applicable.
   *
   * The handler should return a structured object representing the parsed element, typically spreading the options and adding or overriding properties as needed.
   *
   * Example:
   *   handler: (element, options) => ({
   *     ...options,
   *     type: 'paragraph',
   *     text: element.textContent || '',
   *     styles: { fontFamily: 'Arial', fontSize: 12 },
   *   })
   */
  handler: TagHandler;
};

export interface IConverterDependencies {
  /** Optional default styles for each element type */
  defaultStyles?: Partial<
    Record<ElementType, Partial<Record<keyof CSS.Properties, string | number>>>
  >;
  /** Optional stylesheet carrying seeded parser defaults and adapter rules */
  stylesheet?: IStylesheet;
  /** The inheritance rules for styles */
  styleMeta?: Partial<Record<keyof CSS.Properties, StyleMeta>>;
  [key: string]: unknown;
}

/**
 * Constructor type for adapter providers, given converter dependencies.
 */
export type AdapterProvider<ConfigType = unknown> = new (
  dependencies: IConverterDependencies,
  config?: ConfigType
) => IDocumentConverter;

export type CreateAdapterArgs<
  AdapterType extends AdapterProvider = AdapterProvider,
> = {
  format: Formats;
  Adapter: AdapterType;
  dependencies: IConverterDependencies;
  config?: ConstructorParameters<AdapterType>[1];
};

export type CreateAdapter<
  AdapterType extends AdapterProvider = AdapterProvider,
> = (args: CreateAdapterArgs<AdapterType>) => IDocumentConverter;

// export type ConverterOptions = {
//   /** Optional tag handlers to use */
//   tagHandlers?: TagHandlerObject[];
//   /** Optional adapters for different formats */
//   register?: {
//     format: Formats;
//     adapter: IDocumentConverter;
//   }[];
//   /** Optional default styles for specific formats */
//   defaultStyles?: {
//     format: Formats;
//     styles: IConverterDependencies['defaultStyles'];
//   }[];
//   /** Optional default attributes for specific formats */
//   defaultAttributes?: {
//     format: Formats;
//     attributes: IConverterDependencies['defaultAttributes'];
//   }[];
//   /** Optional DOM parser to use */
//   domParser?: IDOMParser;
// };

export type AdapterRegistration<
  AdapterType extends AdapterProvider = AdapterProvider,
> = {
  /** The document format this adapter handles (e.g. 'docx', 'pdf'). */
  format: Formats;

  /** The adapter provider class for this format. */
  adapter: AdapterType;

  /**
   * Custom configuration for the Adapter.
   */
  config?: ConstructorParameters<NoInfer<AdapterType>>[1];

  /**
   * Optional factory hook for constructing this adapter registration.
   */
  createAdapter?: CreateAdapter<NoInfer<AdapterType>>;
};

/**
 * Initialization options for the document conversion module.
 *
 * @property tagHandlers Optional array of custom tag handlers to use for parsing HTML elements.
 * @property adapters Optional configuration object for registering adapters and styles for different formats.
 *   - defaultStyles: Array of default style objects for each format (used by adapters).
 *   - register: Array of adapter registration objects, each with a format and an AdapterProvider.
 * @property domParser Optional custom DOM parser implementation to use for HTML parsing.
 */
export type InitOptions<
  // it should be okay to use any in a generic context
  AdapterProviders extends
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly AdapterProvider<any>[] = AdapterProvider<any>[],
> = {
  /** @deprecated Use plugins instead. */
  middleware?: readonly Middleware[];
  /** Optional plugins to apply during parsing. */
  plugins?: readonly Plugin[];
  /** Whether built-in plugins are enabled. Defaults to true. */
  enableDefaultPlugins?: boolean;
  /**
   * Optional custom style inheritance rules.
   * Allows overriding default inheritance behavior for specific CSS properties.
   */
  styleInheritance?: Partial<Record<keyof CSS.Properties, Partial<StyleMeta>>>;
  /**
   * Optional configuration for custom tag handlers and tag-related options.
   *
   * @property tagHandlers Array of custom tag handler objects, each defining a key (HTML tag) and a handler function.
   *   Use this to override or extend how specific HTML tags are parsed.
   *   Example:
   *     {
   *       key: 'hgroup',
   *       handler: (node, options) => ({ ...options, type: 'heading', text: node.textContent || '' })
   *     }
   *   You can add more tag-related configuration here in the future.
   */
  tags?: {
    /** Array of custom tag handler objects for parsing specific HTML tags. */
    tagHandlers?: readonly TagHandlerObject[];
    defaultStyles?: {
      key: keyof HTMLElementTagNameMap;
      styles: Partial<Record<keyof CSS.Properties, string | number>>;
    }[];
    defaultAttributes?: readonly {
      key: keyof HTMLElementTagNameMap;
      attributes: Record<string, string | number>;
    }[];
  };
  /** Optional stylesheet rules to seed directly into init without constructing a stylesheet instance first. */
  stylesheetRules?: readonly StylesheetStatement[];
  /**
   * Custom stylesheet implementation.
   * You can include extra style rules in this stylesheet, but all other style rules will still be appended.
   * */
  stylesheet?: IStylesheet;
  /** @deprecated Use enableDefaultPlugins instead. */
  clearMiddleware?: boolean;
  /**
   * Optional adapters configuration for supported formats.
   *
   * - defaultStyles: Array of default style objects for each format, used to initialize adapters.
   * - register: Array of adapter registration objects, each specifying a format and its AdapterProvider implementation.
   */
  adapters?: {
    /**
     * Default styles for each supported format.
     *
     * This array allows you to specify default document styles for each target format (e.g., docx, pdf, xlsx).
     * Each entry should include:
     *  - format: The format identifier (e.g., 'docx', 'pdf').
     *  - styles: An object representing the default styles to apply for that format.
     *
     * Example:
     *   defaultStyles: [
     *     {
     *       format: 'docx',
     *       styles: {
     *         heading: { color: 'black', fontFamily: 'Aptos Display' },
     *         paragraph: { lineHeight: 1.5 }
     *       }
     *     }
     *   ]
     */
    defaultStyles?: readonly {
      /** The document format these styles apply to (e.g. 'docx', 'pdf'). */
      format: Formats;
      /** The default styles object to use for this format. */
      styles: IConverterDependencies['defaultStyles'];
    }[];
    /**
     * Adapter registration for each supported format.
     *
     * This array allows you to register a document converter (adapter) for each target format.
     * Each entry should include:
     *  - format: The format identifier (e.g., 'docx', 'pdf').
     *  - adapter: The AdapterProvider implementation for that format.
     *
     * Example:
     *   register: [
     *     { format: 'docx', adapter: DocxAdapter },
     *     { format: 'pdf', adapter: PdfAdapter }
     *   ]
     */
    register?: {
      readonly [AdapterProviderIndex in keyof AdapterProviders]: AdapterRegistration<
        AdapterProviders[AdapterProviderIndex]
      >;
    };
  };
  /** Optional DOM parser to use */
  domParser?: IDOMParser;
};
/**
 * Interface for a DOM parser used to parse HTML strings into Document objects.
 */
export interface IDOMParser {
  /**
   * Parses an HTML string and returns a Document object.
   * @param html - The HTML string to parse.
   */
  parse(html: string): Document;
}
/**
 * Options for configuring a document converter instance.
 */
export type ConverterOptions = InitOptions & {
  registerAdapters?: {
    format: Formats;
    adapter: IDocumentConverter;
  }[];
};

export interface IDocumentConverter {
  convert(
    elements: DocumentElement[],
    stylesheet?: IStylesheet
  ): Promise<Buffer | Blob>;
}

export interface IDocumentDeconverter {
  deconvert(file: Buffer | Blob): Promise<DocumentElement[]>;
}

export type DeconverterProvider = new (
  dependencies: IDeconverterDependencies
) => IDocumentDeconverter;

export interface IDeconverterDependencies {
  [key: string]: unknown;
}
