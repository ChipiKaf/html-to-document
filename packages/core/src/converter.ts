import {
  AdapterProvider,
  AdapterRegistration,
  IDocumentConverter,
} from './types';
import {
  ConverterOptions,
  DocumentElement,
  InitOptions,
  Middleware,
} from './types';
import { Parser } from './parser';
import { StyleMapper } from './style.mapper';
import { MiddlewareManager } from './middleware/middleware.manager';
import { minifyMiddleware } from './middleware/minify.middleware';
import { ConverterRegistry } from './registry';

export class Converter {
  private _middlewareManager: MiddlewareManager;
  private _parser: Parser;
  private _registry: ConverterRegistry;

  constructor(options: ConverterOptions) {
    const { tags, domParser, registerAdapters } = options;
    this._registry = new ConverterRegistry();
    this._middlewareManager = new MiddlewareManager();
    this._parser = new Parser(
      tags?.tagHandlers,
      domParser,
      tags?.defaultStyles,
      tags?.defaultAttributes
    );

    // Register custom adapters
    if (registerAdapters && registerAdapters.length > 0) {
      registerAdapters.forEach(({ format, adapter }) => {
        this.registerConverter(format, adapter);
      });
    }
  }

  public useMiddleware(mw: Middleware) {
    this._middlewareManager.use(mw);
  }

  public registerConverter(format: string, converter: IDocumentConverter) {
    this._registry.register(format, converter);
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

/**
 * A helper function that provides type inference for creating registrations.
 * Using this function is key to ensuring the `config` object is correctly typed.
 */
// for extends it should be okay to use any as it will allow everything to be inferred whereas using unknown would not result in the correct types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createRegistration = <T extends AdapterProvider<any>>(
  registration: AdapterRegistration<T>
): AdapterRegistration<T> => {
  return registration;
};

// it should be okay to use any in a generic context
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const init = <const T extends readonly AdapterProvider<any>[]>(
  options?: InitOptions<T>
) => {
  const {
    middleware,
    tags,
    adapters,
    domParser,
    clearMiddleware = false,
  } = options ?? {};

  // Initialize registered adapters and inject style mapper
  const registerAdapters = adapters?.register?.map(
    ({ format, adapter: Adapter, config }) => {
      const mapper = adapters?.styleMappings?.find(
        (map) => map.format === format
      );
      const styleMapper = new StyleMapper();

      // Overwrite existing style mappings
      if (mapper) {
        styleMapper.addMapping(mapper.handlers);
      }

      // Instantiate Adapters passed in
      const adapter = new Adapter(
        {
          styleMapper,
          defaultStyles:
            adapters?.defaultStyles?.find(
              ({ format: nFormat }) => nFormat === format
            )?.styles || {},
        },
        config
      );
      return { format, adapter, styleMapper };
    }
  );

  const converter = new Converter({
    tags,
    registerAdapters,
    domParser,
    adapters,
  });

  // Default middleware
  if (!clearMiddleware) {
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
