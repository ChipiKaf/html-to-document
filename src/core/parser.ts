import { parseHTML } from '../utils/html.utils';
import { TagHandler } from './types';

export class Parser {
  private _tagHandlers: Map<string, TagHandler>;
  constructor() {
    this._tagHandlers = new Map();
  }

  public registerTagHandler(tag: string, handler: TagHandler) {
    // They are case insensitive
    this._tagHandlers.set(tag.toLowerCase(), handler);
  }

  parse(html: string) {
    return parseHTML(html, this._tagHandlers);
  }
}
