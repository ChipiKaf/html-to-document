import { Middleware, Parser } from './core';
import { MiddlewareManager } from './middleware/middleware.manager';
import { ConverterRegistry } from './registry/converter.registry';

export class Converter {
  private _registry: ConverterRegistry;
  private _middlewareManager: MiddlewareManager;
  private _parser: Parser;

  constructor() {
    this._registry = new ConverterRegistry();
    this._middlewareManager = new MiddlewareManager();
    this._parser = new Parser();

    // Register built in adapters
  }

  public useMiddleware(mw: Middleware) {
    this._middlewareManager.use(mw);
  }

  async covnert(html: string, format: string): Promise<Buffer> {
    const adapter = this._registry.get(format);
    if (!adapter) throw new Error('Format not available');
    const modifiedHtml = await this._middlewareManager.execute(html);
    const parsed = this._parser.parse(modifiedHtml);
    return adapter.convert(parsed);
  }
}
