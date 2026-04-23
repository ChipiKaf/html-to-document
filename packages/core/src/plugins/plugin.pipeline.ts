import { minifyMiddleware } from '../middleware/minify.middleware';
import type {
  DocumentElement,
  HtmlTransformPluginHook,
  Middleware,
  Plugin,
} from '../types';

const DEFAULT_MINIFY_PLUGIN_NAME = 'core:minify-html';
const LEGACY_MIDDLEWARE_PLUGIN_PREFIX = 'legacy-middleware';

const getPluginLabel = (plugin: Plugin, index: number) =>
  plugin.name?.trim() || `plugin-${index + 1}`;

const wrapPluginError = (
  plugin: Plugin,
  index: number,
  hook: 'transformHtml' | 'transformDocument',
  error: unknown
): never => {
  const prefix = `Plugin "${getPluginLabel(plugin, index)}" failed in ${hook}`;

  if (error instanceof Error) {
    throw new Error(`${prefix}: ${error.message}`);
  }

  throw new Error(`${prefix}: ${String(error)}`);
};

const createHtmlPlugin = (
  name: string,
  transformHtml: HtmlTransformPluginHook
): Plugin => ({ name, transformHtml });

export const normalizePlugins = ({
  clearMiddleware = false,
  middleware = [],
  plugins = [],
}: {
  clearMiddleware?: boolean;
  middleware?: readonly Middleware[];
  plugins?: readonly Plugin[];
}): Plugin[] => {
  const normalized: Plugin[] = [];

  if (!clearMiddleware) {
    normalized.push(
      createHtmlPlugin(DEFAULT_MINIFY_PLUGIN_NAME, minifyMiddleware)
    );
  }

  middleware.forEach((mw, index) => {
    normalized.push(
      createHtmlPlugin(`${LEGACY_MIDDLEWARE_PLUGIN_PREFIX}-${index + 1}`, mw)
    );
  });

  normalized.push(...plugins);
  return normalized;
};

export const runHtmlTransformPlugins = async (
  html: string,
  plugins: readonly Plugin[]
): Promise<string> => {
  let current = html;

  for (const [index, plugin] of plugins.entries()) {
    if (!plugin.transformHtml) continue;

    try {
      current = await plugin.transformHtml(current);
    } catch (error) {
      wrapPluginError(plugin, index, 'transformHtml', error);
    }
  }

  return current;
};

export const runDocumentTransformPlugins = async (
  elements: DocumentElement[],
  plugins: readonly Plugin[]
): Promise<DocumentElement[]> => {
  let current = elements;

  for (const [index, plugin] of plugins.entries()) {
    if (!plugin.transformDocument) continue;

    try {
      current = await plugin.transformDocument(current);
    } catch (error) {
      wrapPluginError(plugin, index, 'transformDocument', error);
    }
  }

  return current;
};
