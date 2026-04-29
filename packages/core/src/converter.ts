import {
  AdapterProvider,
  AdapterRegistration,
  CreateAdapter,
  IDocumentConverter,
  IConverterDependencies,
  StyleMeta,
  Styles,
} from './types';
import {
  ConverterOptions,
  DocumentElement,
  InitOptions,
  Middleware,
  Plugin,
} from './types';
import { Parser } from './parser';
import { minifyMiddleware } from './middleware/minify.middleware';
import { ConverterRegistry } from './registry';
import { initStyleMeta } from './styles/style-inheritance';
import {
  defaultStylesToStylesheetRules,
  seedStylesheetBuiltInDefaults,
  tagDefaultStylesToStylesheetRules,
} from './styles/stylesheet-seeding';
import { createStylesheet } from './styles/sheet';
import * as CSS from 'csstype';

export class Converter {
  private _plugins: Plugin[];
  private _parser: Parser;
  private _registry: ConverterRegistry;

  constructor(options: ConverterOptions) {
    const { tags, domParser, registerAdapters } = options;
    this._registry = new ConverterRegistry();
    this._plugins = resolvePlugins(options);
    this._parser = new Parser(
      tags?.tagHandlers,
      domParser,
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
    this._plugins.push(middlewareToPlugin(mw));
  }

  public usePlugin(plugin: Plugin) {
    this._plugins.push(plugin);
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
   * This method first executes any registered plugin hooks that transform the HTML,
   * then uses the configured parser to convert the modified HTML into a document-agnostic
   * intermediate format (`DocumentElement[]`), and finally runs any post-parse plugin hooks.
   *
   * @param html - The raw HTML string to be parsed.
   * @returns A `Promise` that resolves to an array of `DocumentElement` objects representing the parsed content.
   */
  async parse(html: string): Promise<DocumentElement[]> {
    let modifiedHtml = html;

    for (const plugin of this._plugins) {
      if (plugin.beforeParse) {
        modifiedHtml = await plugin.beforeParse(modifiedHtml);
      }
    }

    let parsed = this._parser.parse(modifiedHtml);

    for (const plugin of this._plugins) {
      if (plugin.afterParse) {
        parsed = await plugin.afterParse(parsed);
      }
    }

    return parsed;
  }
}

const middlewareToPlugin = (middleware: Middleware): Plugin => ({
  beforeParse: middleware,
});

const resolvePlugins = ({
  plugins,
  middleware,
  clearMiddleware = false,
  enableDefaultPlugins = !clearMiddleware,
}: Pick<
  ConverterOptions,
  'plugins' | 'middleware' | 'clearMiddleware' | 'enableDefaultPlugins'
>): Plugin[] => {
  const resolvedPlugins: Plugin[] = [];

  if (enableDefaultPlugins) {
    resolvedPlugins.push(minifyPlugin);
  }

  if (plugins && plugins.length > 0) {
    resolvedPlugins.push(...plugins);
  }

  if (middleware && middleware.length > 0) {
    resolvedPlugins.push(...middleware.map(middlewareToPlugin));
  }

  return resolvedPlugins;
};

const minifyPlugin: Plugin = {
  name: 'minify',
  beforeParse: minifyMiddleware,
};

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

const cloneDefaultStyles = (
  defaultStyles: IConverterDependencies['defaultStyles'] = {}
): IConverterDependencies['defaultStyles'] => {
  const clonedDefaultStyles: Record<string, Styles> = {};

  for (const [key, styles] of Object.entries(defaultStyles)) {
    clonedDefaultStyles[key] = { ...(styles as Styles) };
  }

  return clonedDefaultStyles;
};

const cloneStyleMeta = (
  styleMeta: NonNullable<IConverterDependencies['styleMeta']>
): NonNullable<IConverterDependencies['styleMeta']> => {
  const clonedStyleMeta: NonNullable<IConverterDependencies['styleMeta']> = {};

  for (const [property, meta] of Object.entries(styleMeta)) {
    clonedStyleMeta[property as keyof CSS.Properties] = {
      ...(meta as StyleMeta),
      scopes: [...(meta?.scopes ?? [])],
      ...(meta?.cascadeTo ? { cascadeTo: [...meta.cascadeTo] } : {}),
    };
  }

  return clonedStyleMeta;
};

// it should be okay to use any in a generic context
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const init = <const T extends readonly AdapterProvider<any>[]>(
  options?: InitOptions<T>
) => {
  const {
    middleware,
    plugins,
    tags,
    adapters,
    domParser,
    clearMiddleware = false,
    enableDefaultPlugins = !clearMiddleware,
    styleInheritance,
    stylesheetRules = [],
    stylesheet = createStylesheet(),
  } = options ?? {};

  // Initialize style meta
  const styleMeta = initStyleMeta();
  if (styleInheritance) {
    for (const [property, meta] of Object.entries(styleInheritance)) {
      styleMeta[property as keyof CSS.Properties] = {
        ...(styleMeta[property as keyof CSS.Properties] || {
          inherits: false,
          scopes: [],
        }),
        ...meta,
      };
    }
  }

  seedStylesheetBuiltInDefaults(stylesheet);

  for (const rule of tagDefaultStylesToStylesheetRules(tags?.defaultStyles)) {
    stylesheet.add(rule);
  }

  for (const rule of stylesheetRules) {
    stylesheet.add(rule);
  }

  const defaultCreateAdapter: CreateAdapter = ({
    Adapter,
    dependencies,
    config,
  }) => new Adapter(dependencies, config);

  // Initialize registered adapters
  const registerAdapters = adapters?.register?.map(
    ({ format, adapter: Adapter, config, createAdapter }) => {
      const defaultStyles = cloneDefaultStyles(
        adapters?.defaultStyles?.find(
          ({ format: nFormat }) => nFormat === format
        )?.styles
      );
      // FIXME: consider plugin stylesheet decoration and using custom implementation
      const adapterStylesheet = createStylesheet(stylesheet.getStatements());

      for (const rule of defaultStylesToStylesheetRules(defaultStyles)) {
        adapterStylesheet.add(rule);
      }

      const dependencies = {
        defaultStyles,
        stylesheet: adapterStylesheet,
        styleMeta: cloneStyleMeta(styleMeta),
      };
      const adapter = (createAdapter ?? defaultCreateAdapter)({
        format,
        Adapter,
        dependencies,
        config,
      });
      return { format, adapter };
    }
  );

  const converter = new Converter({
    tags,
    registerAdapters,
    domParser,
    adapters,
    plugins,
    middleware,
    clearMiddleware,
    enableDefaultPlugins,
    stylesheet,
  });

  return converter;
};
