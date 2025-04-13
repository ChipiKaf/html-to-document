import { DocxAdapter } from './converters';
import { IDocumentConverter } from './converters/IDocumentConverter';
import { ConverterOptions, InitOptions, Middleware } from './core';
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

  async convert(html: string, format: string): Promise<Buffer | Blob> {
    const adapter = this._registry.get(format);
    if (!adapter) throw new Error('Format not available');
    const modifiedHtml = await this._middlewareManager.execute(html);
    const parsed = this._parser.parse(modifiedHtml);
    return adapter.convert(parsed);
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
