import { Middleware } from '../core/types';

export class MiddlewareManager {
  private _middleware: Middleware[] = [];

  use(mw: Middleware) {
    this._middleware.push(mw);
  }

  async execute(html: string) {
    let result = html;

    for (const mw of this._middleware) {
      result = await mw(result);
    }

    return result;
  }
}
