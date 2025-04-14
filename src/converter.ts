import { DocxAdapter } from './converters';
import { IDocumentConverter } from './converters/IDocumentConverter';
import {
  ConverterOptions,
  DocumentElement,
  InitOptions,
  Middleware,
} from './core';
import { Parser } from './core/parser';
import { StyleMapper } from './core/style.mapper';
import { MiddlewareManager } from './middleware/middleware.manager';
import { minifyMiddleware } from './middleware/minify.middleware';
import { ConverterRegistry } from './registry';

export class Converter {
  private _middlewareManager: MiddlewareManager;
  private _parser: Parser;
  private _registry: ConverterRegistry;

  constructor(options: ConverterOptions) {
    const { tagHandlers, adapters, domParser, defaultStyles } = options;
    this._registry = new ConverterRegistry();
    this._middlewareManager = new MiddlewareManager();
    this._parser = new Parser(tagHandlers, domParser);

    // Register default Adapters
    const docxAdapter = new DocxAdapter({
      styleMapper:
        adapters?.find((adapter) => adapter.format === 'docx')?.styleMapper ||
        new StyleMapper(),
      defaultStyles:
        defaultStyles?.find((s) => s.format === 'docx')?.styles || {},
    });
    this.registerConverter('docx', docxAdapter);

    // Register custom adapters
    if (adapters && adapters.length > 0) {
      adapters.forEach(({ format, adapter }) => {
        this.registerConverter(format, adapter);
      });
    }
  }

  public useMiddleware(mw: Middleware) {
    this._middlewareManager.use(mw);
  }

  public registerConverter(name: string, converter: IDocumentConverter) {
    this._registry.register(name, converter);
  }

  /**
   * Converts the provided content into a specified file format (e.g., DOCX, PDF, Markdown, etc.).
   *
   * @param content - The input content to convert. Can be either:
   *   - A raw HTML string to be parsed before conversion, or
   *   - A pre-parsed array of `DocumentElement` objects.
   * @param format - The target output format (e.g., `'docx'`, `'pdf'`, `'md'`, etc.).
   * @returns A `Promise` that resolves to a `Buffer` (for Node environments) or a `Blob` (for browser environments),
   *          representing the generated file in the specified format.
   *
   * @throws Will throw an error if the specified format does not have a registered adapter.
   */
  async convert(
    content: string | DocumentElement[],
    format: string
  ): Promise<Buffer | Blob> {
    const adapter = this._registry.get(format);
    if (!adapter) throw new Error('Format not available');

    let parsed: DocumentElement[];

    if (typeof content === 'string') {
      parsed = await this.parse(content);
    } else parsed = content;

    return adapter.convert(parsed);
  }

  /**
   * Parses an HTML string into a structured array of `DocumentElement` objects.
   *
   * This method first executes any registered middleware transformations on the HTML,
   * then uses the configured parser to convert the modified HTML into a document-agnostic
   * intermediate format (`DocumentElement[]`), which can be used by format adapters (e.g., DOCX, PDF).
   *
   * @param html - The raw HTML string to be parsed.
   * @returns A `Promise` that resolves to an array of `DocumentElement` objects representing the parsed content.
   */
  async parse(html: string): Promise<DocumentElement[]> {
    const modifiedHtml = await this._middlewareManager.execute(html);
    return this._parser.parse(modifiedHtml);
  }
}

export const init = (options: InitOptions = {}) => {
  const {
    middleware,
    tagHandlers,
    adapters: Adapters,
    defaultStyles,
    styleMappings,
    domParser,
  } = options;

  // Adapters
  const adapters = Adapters?.map(({ format, adapter: Adapter }) => {
    const mapper = styleMappings?.find((map) => map.format === format);
    const styleMapper = new StyleMapper();

    // Overwrite existing style mappings
    if (mapper) {
      styleMapper.addMapping(mapper.handlers);
    }

    // Instantiate Adapters passed in
    const adapter = new Adapter({
      styleMapper,
      defaultStyles:
        defaultStyles?.find(({ format: nFormat }) => nFormat === format)
          ?.styles || {},
    });
    return { format, adapter, styleMapper };
  });

  const converter = new Converter({
    tagHandlers,
    adapters,
    domParser,
    defaultStyles,
  });

  // Default middleware
  if (!options.clearMiddleware) {
    converter.useMiddleware(minifyMiddleware);
  }

  // Incoming middleware
  if (middleware && middleware.length > 0) {
    middleware.forEach((mw) => {
      converter.useMiddleware(mw);
    });
  }

  return converter;
};
